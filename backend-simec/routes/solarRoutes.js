// Rotas da integracao Solar generica. Tenant-scoped.
//
// Admin:
//   GET    /api/solar/providers            lista adapters disponiveis (metadata do form)
//   GET    /api/solar/plants               lista plantas do tenant
//   POST   /api/solar/plants               cria/atualiza planta (upsert por id)
//   DELETE /api/solar/plants/:id           soft delete (ativo=false)
//   POST   /api/solar/plants/:id/inverters adiciona inverter na planta
//   PUT    /api/solar/inverters/:id        edita inverter (inclui trocar credencial)
//   DELETE /api/solar/inverters/:id        remove inverter
//   POST   /api/solar/validar-credencial   testa credencial sem salvar
//
// Operador/Admin (leitura):
//   GET /api/solar/plants/:id/status                snapshot mais recente agregado
//   GET /api/solar/plants/:id/historico?inicio&fim  timeseries pro grafico
//   GET /api/solar/plants/:id/quedas                lista de quedas de energia

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { encryptCredential, decryptCredential } from '../services/solar/solarCrypto.js';
import { getAdapter, listAdapters } from '../services/solar/adapters/index.js';
import * as sungrowAdapter from '../services/solar/adapters/sungrowAdapter.js';
import { getRedisConnection } from '../services/queueService.js';

const router = express.Router();

// Tenta puxar modelo + capacidade do inverter diretamente da API do
// fabricante (chamando adapter.validarCredencial) e persistir no banco
// se os campos estiverem vazios. Usada depois de criar inverter OU
// depois de OAuth Sungrow completar. Falha silenciosa — se o adapter
// nao conseguir retornar dados agora, o inverter fica com os campos
// vazios ate o admin editar manualmente.
async function tentarAutoPopularMetadados(inverterId) {
  try {
    const inv = await prisma.solarInverter.findUnique({
      where: { id: inverterId },
      select: {
        id: true, provider: true, apiBase: true, inverterSn: true,
        modeloInversor: true, capacidadeKw: true, credentialCrypt: true,
        plantId: true, tenantId: true,
      },
    });
    if (!inv) return;

    // Se ambos ja preenchidos, nao precisa ir pra API.
    if (inv.modeloInversor && inv.capacidadeKw != null) return;

    const adapter = getAdapter(inv.provider);
    const credential = decryptCredential(inv.credentialCrypt);
    if (!credential) return;

    const r = await adapter.validarCredencial(credential, inv.apiBase);
    if (!r?.ok || !Array.isArray(r.devices)) return;

    const match = r.devices.find((d) => String(d.sn).trim() === String(inv.inverterSn).trim());
    if (!match) return;

    const patch = {};
    if (!inv.modeloInversor && match.modelo) patch.modeloInversor = match.modelo;
    if (inv.capacidadeKw == null && match.capacidadeKw != null) patch.capacidadeKw = match.capacidadeKw;
    if (Object.keys(patch).length === 0) return;

    await prisma.solarInverter.update({ where: { id: inv.id }, data: patch });

    // Bonus: se a planta nao tem capacidade_kwp e a API retornou stationKwp,
    // sugere no log (nao sobrescreve automaticamente — admin decide se
    // a station da API bate com o conceito de planta no SIMEC).
    if (match.stationKwp != null) {
      const plant = await prisma.solarPlant.findUnique({
        where: { id: inv.plantId },
        select: { capacidadeKwp: true },
      });
      if (plant && plant.capacidadeKwp == null) {
        await prisma.solarPlant.update({
          where: { id: inv.plantId },
          data: { capacidadeKwp: match.stationKwp },
        });
      }
    }
  } catch (err) {
    console.warn(`[SOLAR_AUTOFILL] Falha ao auto-popular metadados do inverter ${inverterId}:`, err.message);
  }
}

// ─── OAuth callback Sungrow (publico, SEM proteger) ────────────────────────
//
// Path EXATO: /api/solar/sungrow/callback (sem /oauth/). Tem que bater
// com o Redirect URI registrado no Developer Portal Sungrow.
//
// Sungrow NAO devolve 'state' no callback — devolve apenas 'code'. Entao
// o pareamento com o inverter precisa ser feito antes do redirect: a UI
// chama /sungrow/authorize-url que salva (inverterId -> code) em cache
// no Redis com TTL de 10min. Quando callback chega, pegamos o inverterId
// pendente mais recente (unico por sessao do admin).
//
// Pra simplificar — como admin autoriza um inverter por vez — o cache
// e uma fila simples onde o ultimo authorize-url inserido vence o code
// que chegar. Se dois admins autorizarem simultaneamente, pode haver
// race condition; nao e um caso real agora com 2-3 inverters/tenant.
//
// IMPORTANTE: esse handler e exportado separadamente (sungrowCallbackPublic)
// e montado em server.js ANTES do app.use(proteger) global — o middleware
// de autenticacao bloqueia tudo que vem depois dele, entao o callback
// precisa estar fora dessa linha. O router default abaixo so cuida das
// rotas protegidas (admin + operador).
export const sungrowCallbackPublic = express.Router();
sungrowCallbackPublic.get('/sungrow/callback', async (req, res) => {
  const { code, error, error_description, redirectUri: redirectUriQuery } = req.query;

  // Entry log — dispara ANTES de qualquer validacao, pra sabermos que
  // a rota foi chamada mesmo quando a resposta termina em 400.
  console.log('[SUNGROW_CALLBACK_HIT]', {
    temCode: Boolean(code),
    codeLen: code ? String(code).length : 0,
    error: error || null,
    redirectUriQuery: redirectUriQuery || null,
    fromIp: req.ip,
    userAgent: (req.get('user-agent') || '').slice(0, 80),
  });

  const htmlResposta = (titulo, mensagem, sucesso = false) => `
    <!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>${titulo}</title>
    <style>
      body{margin:0;padding:40px;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;text-align:center}
      .card{max-width:480px;margin:40px auto;padding:24px;border-radius:12px;background:#1e293b;border:1px solid #334155}
      h1{color:${sucesso ? '#22c55e' : '#ef4444'};font-size:20px;margin:0 0 12px}
      p{color:#94a3b8;line-height:1.5}
      .btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px}
    </style></head><body>
      <div class="card">
        <h1>${titulo}</h1>
        <p>${mensagem}</p>
        <a href="javascript:window.close()" class="btn">Fechar janela</a>
      </div>
      <script>setTimeout(() => { try { window.opener && window.opener.postMessage({ sungrowAuth: '${sucesso ? 'ok' : 'erro'}' }, '*'); } catch(e){} }, 300);</script>
    </body></html>`;

  if (error) {
    return res.status(400).send(htmlResposta(
      'Autorizacao negada',
      `Sungrow retornou erro: ${error_description || error}`,
      false
    ));
  }
  if (!code) {
    return res.status(400).send(htmlResposta('Parametro ausente', 'code nao veio na URL.', false));
  }

  let inverterIdParaErro = null;
  try {
    // Sungrow NAO devolve state no callback. O pareamento code <-> inverter
    // e feito via Redis em duas camadas:
    //   1. Chaves per-inverter `sungrow:pending:<id>` guardam o timestamp
    //      de cada authorize-url iniciado. TTL 30min.
    //   2. Chave global `sungrow:pending-authorize` mantem o ultimo
    //      authorize-url (fallback). TTL 30min.
    // O callback pega a chave per-inverter mais recente; se nao achar
    // nenhuma, cai no global.
    const redisConnection = getRedisConnection();
    if (!redisConnection) throw new Error('Redis indisponivel');

    const keys = await redisConnection.keys('sungrow:pending:*');
    let inverterId = null;
    if (keys.length > 0) {
      const timestamps = await Promise.all(keys.map(async (k) => {
        const v = await redisConnection.get(k);
        return { key: k, ts: Number(v) || 0 };
      }));
      timestamps.sort((a, b) => b.ts - a.ts);
      const vencedora = timestamps[0];
      inverterId = vencedora.key.replace('sungrow:pending:', '');
      // Limpa todas as chaves per-inverter — uma vez que tratamos este code,
      // qualquer autorizacao pendente anterior deve ser reiniciada.
      await Promise.all(keys.map((k) => redisConnection.del(k)));
    } else {
      inverterId = await redisConnection.get('sungrow:pending-authorize');
    }
    await redisConnection.del('sungrow:pending-authorize');

    if (!inverterId) {
      throw new Error('Nenhuma autorizacao pendente. Clique "Autorizar" no SIMEC novamente e tente de novo (a janela de 30 min expirou).');
    }
    inverterIdParaErro = inverterId;

    const inverter = await prisma.solarInverter.findFirst({
      where: { id: inverterId, provider: 'sungrow' },
      select: { id: true, apiBase: true, credentialCrypt: true, tenantId: true },
    });
    if (!inverter) throw new Error('inverter nao encontrado');

    const credential = decryptCredential(inverter.credentialCrypt) || {};

    // IMPORTANTE: o redirect_uri precisa ser EXATAMENTE o mesmo que foi
    // registrado no Developer Portal Sungrow e usado no redirecionamento
    // real. Se a Sungrow redireciona pro bare dominio (simec.cerdil.com.br/)
    // em vez do path /api/solar/sungrow/callback, o SPA intercepta e
    // repassa o code pro callback junto com o redirectUri que a Sungrow
    // de fato usou (= a URL raiz).
    //
    // Fallback: se nao veio redirectUri na query, assume que a Sungrow
    // chamou direto esse endpoint, entao usa o path do callback.
    const redirectUri = redirectUriQuery
      || `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    console.log('[SUNGROW_OAUTH_CALLBACK] trocando code por token', {
      inverterId,
      codeLen: String(code).length,
      apiBase: inverter.apiBase,
      redirectUri,
      viaInterceptor: Boolean(redirectUriQuery),
      temAppkey: Boolean(credential.appkey),
      temSecret: Boolean(credential.secretKey),
    });
    const { accessToken, refreshToken, expiresIn } = await sungrowAdapter.exchangeCodeForToken({
      apiBase: inverter.apiBase,
      appkey: credential.appkey,
      secretKey: credential.secretKey,
      code: String(code),
      redirectUri,
      rsaPublicKey: credential.rsaPublicKey,
    });

    const novaCredencial = {
      ...credential,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    await prisma.solarInverter.update({
      where: { id: inverter.id },
      data: {
        credentialCrypt: encryptCredential(novaCredencial),
        lastAuthAttemptAt: new Date(),
        lastAuthError: null,
      },
    });

    // Propagacao: a autorizacao Sungrow e por conta iSolarCloud (appkey),
    // nao por inverter. Se o mesmo tenant tem outros inverters Sungrow com
    // o mesmo appkey, eles compartilham o accessToken — espelha os novos
    // tokens em todos eles pra evitar OAuth redundante.
    try {
      const outros = await prisma.solarInverter.findMany({
        where: {
          tenantId: inverter.tenantId,
          provider: 'sungrow',
          id: { not: inverter.id },
        },
        select: { id: true, credentialCrypt: true },
      });
      let propagadosCount = 0;
      for (const o of outros) {
        const credO = decryptCredential(o.credentialCrypt) || {};
        if (credO.appkey && credO.appkey === credential.appkey) {
          const novaO = {
            ...credO,
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000,
          };
          await prisma.solarInverter.update({
            where: { id: o.id },
            data: {
              credentialCrypt: encryptCredential(novaO),
              lastAuthAttemptAt: new Date(),
              lastAuthError: null,
            },
          });
          propagadosCount++;
          tentarAutoPopularMetadados(o.id).catch(() => {});
        }
      }
      if (propagadosCount > 0) {
        console.log(`[SUNGROW_OAUTH_CALLBACK] token propagado para ${propagadosCount} inverter(es) com mesmo appkey.`);
      }
    } catch (propErr) {
      console.warn('[SUNGROW_OAUTH_CALLBACK] propagacao falhou (continuo):', propErr.message);
    }

    // Agora que tem access_token, puxa modelo + capacidade da API Sungrow
    // (best-effort). Sem isso o admin teria que digitar manualmente mesmo
    // depois do OAuth.
    tentarAutoPopularMetadados(inverter.id).catch(() => {});

    return res.send(htmlResposta(
      'Autorizado com sucesso',
      'O inversor Sungrow agora pode ser monitorado. Pode fechar esta janela e voltar ao SIMEC.',
      true
    ));
  } catch (err) {
    console.error('[SUNGROW_OAUTH_CALLBACK]', err);
    // Persiste o erro no inversor pra UI mostrar sem depender de log.
    if (inverterIdParaErro) {
      await prisma.solarInverter.update({
        where: { id: inverterIdParaErro },
        data: {
          lastAuthAttemptAt: new Date(),
          lastAuthError: String(err.message || err).slice(0, 2000),
        },
      }).catch(() => {});
    }
    return res.status(400).send(htmlResposta('Falha na autorizacao', err.message, false));
  }
});

router.use(proteger);

// Rotas protegidas: tudo que vem depois exige token + tenant. O OAuth
// callback acima nao chega aqui (esta em sungrowCallbackPublic). Mesmo
// assim deixamos o router.use(proteger) explicito como salvaguarda caso
// alguem monte esse router em outro lugar sem o proteger global do server.

// ─── Providers disponiveis (metadata do form na UI) ─────────────────────────
router.get('/providers', (_req, res) => {
  res.json(listAdapters());
});

// ─── Listar plantas (com inverters + baterias + snapshot mais recente) ──────
router.get('/plants', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const plants = await prisma.solarPlant.findMany({
      where: { tenantId },
      include: {
        unidade: { select: { id: true, nomeSistema: true } },
        inverters: {
          select: {
            id: true, provider: true, nome: true, inverterSn: true,
            modeloInversor: true, capacidadeKw: true, apiBase: true, ativo: true,
          },
        },
        baterias: {
          select: { id: true, sn: true, provider: true, capacidadeKwh: true, ativo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Upsert planta (campos admin, sem inverters — esses tem rota propria) ───
router.post('/plants', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const {
    id, unidadeId, nome, localFisico, capacidadeKwp, tarifaKwh,
    temBateria, autonomiaHoras, alertaOfflineMinutos,
  } = req.body || {};

  if (!unidadeId || !nome) {
    return res.status(400).json({ error: 'Campos obrigatorios: unidadeId, nome' });
  }

  try {
    const unidade = await prisma.unidade.findFirst({
      where: { tenantId, id: unidadeId },
      select: { id: true },
    });
    if (!unidade) return res.status(404).json({ error: 'Unidade nao encontrada' });

    const dados = {
      tenantId, unidadeId, nome,
      localFisico: localFisico || null,
      capacidadeKwp: capacidadeKwp != null ? Number(capacidadeKwp) : null,
      tarifaKwh: tarifaKwh != null ? Number(tarifaKwh) : null,
      temBateria: !!temBateria,
      autonomiaHoras: autonomiaHoras != null ? Number(autonomiaHoras) : null,
      alertaOfflineMinutos: alertaOfflineMinutos != null ? Number(alertaOfflineMinutos) : null,
      ativo: true,
    };

    const plant = id
      ? await prisma.solarPlant.update({ where: { id }, data: dados })
      : await prisma.solarPlant.create({ data: dados });

    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/plants/:id', admin, async (req, res) => {
  try {
    await prisma.solarPlant.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Adicionar inverter na planta ───────────────────────────────────────────
router.post('/plants/:plantId/inverters', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const { plantId } = req.params;
  const { provider, nome, inverterSn, modeloInversor, capacidadeKw, credential, apiBase } = req.body || {};

  if (!provider || !inverterSn || !credential) {
    return res.status(400).json({ error: 'Campos obrigatorios: provider, inverterSn, credential' });
  }

  try {
    const plant = await prisma.solarPlant.findFirst({
      where: { id: plantId, tenantId },
      select: { id: true },
    });
    if (!plant) return res.status(404).json({ error: 'Planta nao encontrada' });

    const adapter = getAdapter(provider); // valida provider conhecido
    const finalApiBase = apiBase || adapter.defaultApiBase;

    const inverter = await prisma.solarInverter.create({
      data: {
        tenantId,
        plantId,
        provider,
        nome: nome || null,
        inverterSn,
        modeloInversor: modeloInversor || null,
        capacidadeKw: capacidadeKw != null ? Number(capacidadeKw) : null,
        credentialCrypt: encryptCredential(credential),
        apiBase: finalApiBase,
        ativo: true,
      },
      select: { id: true, provider: true, inverterSn: true, apiBase: true, ativo: true },
    });

    // Best-effort: puxa modelo + capacidade da API em background. Nao
    // bloqueia a resposta — admin ve o inverter criado imediatamente,
    // e os campos auto-populam no proximo reload da lista.
    tentarAutoPopularMetadados(inverter.id).catch(() => {});

    res.json(inverter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Editar inverter (opcionalmente troca credencial) ───────────────────────
router.put('/inverters/:id', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const { nome, inverterSn, modeloInversor, capacidadeKw, credential, apiBase, ativo } = req.body || {};
  try {
    const existente = await prisma.solarInverter.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, provider: true, apiBase: true },
    });
    if (!existente) return res.status(404).json({ error: 'Inverter nao encontrado' });

    const patch = {};
    if (nome !== undefined) patch.nome = nome || null;
    if (inverterSn !== undefined) patch.inverterSn = inverterSn;
    if (modeloInversor !== undefined) patch.modeloInversor = modeloInversor || null;
    if (capacidadeKw !== undefined) patch.capacidadeKw = capacidadeKw != null ? Number(capacidadeKw) : null;
    if (apiBase !== undefined) patch.apiBase = apiBase || existente.apiBase;
    if (credential) patch.credentialCrypt = encryptCredential(credential);
    if (ativo !== undefined) patch.ativo = !!ativo;

    const inverter = await prisma.solarInverter.update({
      where: { id: req.params.id },
      data: patch,
      select: { id: true, provider: true, inverterSn: true, apiBase: true, ativo: true },
    });
    res.json(inverter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inverters/:id', admin, async (req, res) => {
  try {
    await prisma.solarInverter.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Gerenciar baterias ─────────────────────────────────────────────────────
router.post('/plants/:plantId/baterias', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const { plantId } = req.params;
  const { sn, capacidadeKwh, provider } = req.body || {};
  if (!sn || !provider) {
    return res.status(400).json({ error: 'Campos obrigatorios: sn, provider' });
  }
  try {
    const b = await prisma.solarBattery.create({
      data: {
        tenantId, plantId, sn, provider,
        capacidadeKwh: capacidadeKwh != null ? Number(capacidadeKwh) : null,
        ativo: true,
      },
      select: { id: true, sn: true, provider: true, capacidadeKwh: true, ativo: true },
    });
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/baterias/:id', admin, async (req, res) => {
  try {
    await prisma.solarBattery.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Sungrow OAuth: gera authorize URL ──────────────────────────────────────
// Sungrow usa fluxo proprio (nao OAuth2 standard): precisa de cloudId +
// applicationId na URL (nao de state). Como Sungrow nao devolve state no
// callback, salvamos o inverterId pendente no Redis com TTL 10min — o
// callback consome essa chave pra saber qual inverter atualizar.
//
// Redirect URI tem que bater EXATO com o registrado no portal Sungrow:
//   https://simec.cerdil.com.br/api/solar/sungrow/callback
router.post('/inverters/:id/sungrow/authorize-url', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const inverter = await prisma.solarInverter.findFirst({
      where: { id: req.params.id, tenantId, provider: 'sungrow' },
      select: { id: true, apiBase: true, credentialCrypt: true },
    });
    if (!inverter) return res.status(404).json({ error: 'Inverter Sungrow nao encontrado' });

    const credential = decryptCredential(inverter.credentialCrypt);
    if (!credential?.appkey) {
      return res.status(400).json({ error: 'Credencial do inverter nao tem appkey. Reconfigure.' });
    }
    if (!credential.applicationId || !credential.cloudId) {
      return res.status(400).json({
        error: 'Credencial Sungrow incompleta: faltam applicationId e cloudId. Edite o inversor e preencha esses 2 campos (que aparecem na "Authorization URL" do Developer Portal).',
      });
    }

    // Salva inverterId no Redis com TTL 30min pro callback poder parear.
    // Chave global `sungrow:pending-authorize` continua sendo escrita pra
    // compatibilidade; chave per-inverter `sungrow:pending:<id>` guarda o
    // timestamp pra desempatar quando ha varias autorizacoes pendentes
    // (ex: 2 inverters Sungrow sendo autorizados no mesmo tenant).
    const redisConnection = getRedisConnection();
    if (!redisConnection) {
      return res.status(500).json({ error: 'Redis indisponivel' });
    }
    const agora = Date.now();
    await redisConnection.set('sungrow:pending-authorize', inverter.id, 'EX', 1800);
    await redisConnection.set(`sungrow:pending:${inverter.id}`, String(agora), 'EX', 1800);

    // Marca inicio da tentativa pra diagnostico.
    await prisma.solarInverter.update({
      where: { id: inverter.id },
      data: {
        lastAuthAttemptAt: new Date(),
        lastAuthError: null,
      },
    }).catch(() => {});

    // Redirect URI deve ser EXATO o registrado no portal. Hardcoded aqui
    // porque o Developer Portal exige igualdade estrita e o host dos
    // deploys muda (staging vs prod). Simec cerdil.com.br roteia /api/*
    // pro backend via reverse proxy Railway/Cloudflare — por isso o
    // dominio e sempre o do frontend.
    const redirectUri = 'https://simec.cerdil.com.br/api/solar/sungrow/callback';

    const authorizeUrl = sungrowAdapter.getAuthorizeUrl({
      credential,
      redirectUri,
    });

    res.json({ authorizeUrl, redirectUri, expiresInMinutes: 10 });
  } catch (err) {
    console.error('[SUNGROW_AUTHORIZE_URL]', err);
    res.status(500).json({ error: err.message });
  }
});

// Retorna se o inverter Sungrow tem accessToken valido (pra UI mostrar
// badge "Autorizado" vs "Precisa autorizar").
router.get('/inverters/:id/sungrow/auth-status', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const inverter = await prisma.solarInverter.findFirst({
      where: { id: req.params.id, tenantId, provider: 'sungrow' },
      select: {
        id: true, credentialCrypt: true,
        lastAuthAttemptAt: true, lastAuthError: true,
      },
    });
    if (!inverter) return res.status(404).json({ error: 'Inverter nao encontrado' });
    const cred = decryptCredential(inverter.credentialCrypt) || {};
    const autorizado = Boolean(cred.accessToken);
    const expiresAt = cred.expiresAt || null;
    res.json({
      autorizado,
      expiresAt,
      precisaRenovar: autorizado && expiresAt && expiresAt < Date.now(),
      lastAuthAttemptAt: inverter.lastAuthAttemptAt,
      lastAuthError: inverter.lastAuthError,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Validar credencial (teste sem salvar) ──────────────────────────────────
router.post('/validar-credencial', admin, async (req, res) => {
  const { provider, credential, apiBase } = req.body || {};
  if (!provider || !credential) {
    return res.status(400).json({ error: 'Campos obrigatorios: provider, credential' });
  }
  try {
    const adapter = getAdapter(provider);
    const r = await adapter.validarCredencial(credential, apiBase || adapter.defaultApiBase);

    // precisaAutorizar=true nao e erro — e o fluxo OAuth pedindo o
    // proximo passo. Devolve 200 com flag pra UI tratar como info
    // em vez de pintar de vermelho.
    if (r.precisaAutorizar) {
      return res.json({ ok: false, precisaAutorizar: true, mensagem: r.erro });
    }

    if (!r.ok) return res.status(400).json({ error: r.erro || 'Credencial invalida' });
    res.json({ ok: true, devices: r.devices || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Diagnostico de um inverter (admin) ─────────────────────────────────────
// Chama adapter.fetchSnapshot direto e devolve o payload cru (ou o erro).
// Objetivo: entender rapido por que o poller nao traz dados sem precisar
// abrir log do Railway (ex: SN errado, token expirado, conta sem plantas).
router.get('/inverters/:id/diagnostico', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const inverter = await prisma.solarInverter.findFirst({
      where: { id: req.params.id, tenantId },
      select: {
        id: true, provider: true, inverterSn: true, apiBase: true,
        modeloInversor: true, credentialCrypt: true, plantId: true,
      },
    });
    if (!inverter) return res.status(404).json({ error: 'Inverter nao encontrado' });

    const credential = decryptCredential(inverter.credentialCrypt);
    if (!credential) {
      return res.json({ ok: false, etapa: 'decrypt', erro: 'Credencial vazia ou invalida.' });
    }

    const adapter = getAdapter(inverter.provider);

    // 1. Tenta listar plantas/devices visiveis pelo token (contexto da conta).
    let visao = null;
    try {
      const r = await adapter.validarCredencial(credential, inverter.apiBase || adapter.defaultApiBase);
      visao = {
        ok: r.ok,
        precisaAutorizar: r.precisaAutorizar || false,
        totalPlantasVisiveis: r.stations?.length ?? 0,
        plantas: (r.stations || []).slice(0, 10),
        totalDevicesVisiveis: r.devices?.length ?? 0,
        devicesSn: (r.devices || []).slice(0, 10).map((d) => ({
          sn: d.sn, estacao: d.estacao, capacidadeKw: d.capacidadeKw, modelo: d.modelo,
        })),
        erro: r.erro || null,
      };
    } catch (err) {
      visao = { ok: false, erro: err.message };
    }

    // 2. Tenta fetchSnapshot com o SN cadastrado — este e o teste que o
    //    poller faz a cada 60s, o erro aqui e literalmente o motivo
    //    pelo qual os cards estao vazios.
    let coleta = null;
    try {
      const snap = await adapter.fetchSnapshot({
        inverterSn: inverter.inverterSn,
        apiBase: inverter.apiBase,
        credential,
        modeloInversor: inverter.modeloInversor,
      });
      coleta = {
        ok: true,
        powerKw: snap.powerKw,
        generationKwhDay: snap.generationKwhDay,
        inverterTempC: snap.inverterTempC,
        rawPayload: snap.rawPayload || null,
      };
    } catch (err) {
      coleta = { ok: false, codigo: err.code || null, erro: err.message };
    }

    // Pra Sungrow, inclui o buffer de ultimas chamadas HTTP cruas da
    // sessao do backend — permite ver EXATAMENTE o que a Sungrow devolveu
    // sem depender de log do Railway.
    let ultimasChamadas = null;
    let curlTeste = null;
    if (inverter.provider === 'sungrow') {
      try {
        ultimasChamadas = sungrowAdapter.getUltimasChamadasSungrow?.() || null;
      } catch {}

      // Monta cURL pronto pro admin rodar no terminal fora do SIMEC.
      // Isola rapido se o problema esta no SIMEC ou na Application.
      if (credential?.appkey && credential?.secretKey) {
        const base = inverter.apiBase || adapter.defaultApiBase;
        const url = `${base}/openapi/platform/queryPowerStationList`;
        curlTeste =
          `curl -X POST "${url}" ` +
          `-H "Content-Type: application/json;charset=UTF-8" ` +
          `-H "x-access-key: ${credential.secretKey}" ` +
          `-H "appkey: ${credential.appkey}" ` +
          `-H "sys_code: 901" ` +
          `-H "lang: _pt_BR" ` +
          (credential.accessToken ? `-H "Authorization: Bearer ${credential.accessToken}" ` : '') +
          `-d "{\\"ps_type\\":\\"1,3,4,5,6,7,8,12\\",\\"valid_flag\\":\\"1,3\\",\\"page\\":1,\\"size\\":100}"`;
      }
    }

    res.json({
      inverterId: inverter.id,
      provider: inverter.provider,
      inverterSnCadastrado: inverter.inverterSn,
      apiBase: inverter.apiBase || adapter.defaultApiBase,
      visaoDaConta: visao,
      coletaDoSn: coleta,
      ultimasChamadas,
      curlTeste,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Gera comando curl para testar Sungrow fora do SIMEC (admin) ────────────
// Se o curl der o MESMO er_invalid_appkey, o problema esta na Application
// no portal Sungrow (nao no SIMEC). Se o curl funcionar, o problema esta
// em algum middleware do SIMEC que corrompe o envelope.
router.get('/inverters/:id/sungrow/curl-test', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const inverter = await prisma.solarInverter.findFirst({
      where: { id: req.params.id, tenantId, provider: 'sungrow' },
      select: { id: true, apiBase: true, credentialCrypt: true },
    });
    if (!inverter) return res.status(404).json({ error: 'Inverter nao encontrado' });
    const cred = decryptCredential(inverter.credentialCrypt) || {};
    if (!cred.appkey || !cred.secretKey) {
      return res.status(400).json({ error: 'Credencial sem appkey/secretKey' });
    }

    const base = inverter.apiBase || 'https://gateway.isolarcloud.com.hk';
    const url = `${base}/openapi/platform/queryPowerStationList`;

    // Comando pra rodar no cmd/powershell/bash — testa a mesma chamada
    // que o SIMEC faz, sem passar pelo codigo do SIMEC.
    const curlCmd =
      `curl -X POST "${url}" ` +
      `-H "Content-Type: application/json;charset=UTF-8" ` +
      `-H "x-access-key: ${cred.secretKey}" ` +
      `-H "appkey: ${cred.appkey}" ` +
      `-H "sys_code: 901" ` +
      `-H "lang: _pt_BR" ` +
      (cred.accessToken ? `-H "Authorization: Bearer ${cred.accessToken}" ` : '') +
      `-d "{\\"ps_type\\":\\"1,3,4,5,6,7,8,12\\",\\"valid_flag\\":\\"1,3\\",\\"page\\":1,\\"size\\":100}"`;

    res.json({
      instrucoes:
        'Copie o campo curlCmd e cole num terminal (cmd, powershell, bash, git-bash). ' +
        'A Sungrow deve responder identico ao que o SIMEC recebe. Se responder, o problema esta no SIMEC. ' +
        'Se der o mesmo er_invalid_appkey, o problema esta na Application no portal Sungrow.',
      appkeyEmUso: cred.appkey.slice(0, 8) + '...',
      secretEmUso: cred.secretKey.slice(0, 6) + '...',
      temAccessToken: Boolean(cred.accessToken),
      url,
      curlCmd,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Status atual da planta (snapshot mais recente agregado) ────────────────
router.get('/plants/:id/status', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const plant = await prisma.solarPlant.findFirst({
      where: { tenantId, id: req.params.id },
      include: {
        unidade: { select: { id: true, nomeSistema: true } },
        inverters: {
          select: { id: true, provider: true, nome: true, inverterSn: true, modeloInversor: true, capacidadeKw: true, ativo: true },
        },
        baterias: { select: { id: true, sn: true, provider: true } },
      },
    });
    if (!plant) return res.status(404).json({ error: 'Planta nao encontrada' });

    // Pega snapshot mais recente por inverter
    const ultimosPorInverter = await Promise.all(
      plant.inverters.filter((i) => i.ativo).map(async (inv) => {
        const s = await prisma.solarSnapshot.findFirst({
          where: { tenantId, inverterId: inv.id },
          orderBy: { capturedAt: 'desc' },
        });
        return { inverterId: inv.id, provider: inv.provider, snapshot: s };
      })
    );

    const quedaAtiva = await prisma.solarOutage.findFirst({
      where: { tenantId, plantId: plant.id, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });

    res.json({ plant, snapshotsPorInverter: ultimosPorInverter, quedaAtiva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Historico (timeseries agregada por planta — soma dos inverters) ────────
router.get('/plants/:id/historico', async (req, res) => {
  const tenantId = req.tenantContext;
  const { inicio, fim } = req.query;
  const dataInicio = inicio ? new Date(inicio) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dataFim    = fim    ? new Date(fim + 'T23:59:59.999Z') : new Date();

  try {
    const snapshots = await prisma.solarSnapshot.findMany({
      where: {
        tenantId, plantId: req.params.id,
        capturedAt: { gte: dataInicio, lte: dataFim },
      },
      orderBy: { capturedAt: 'asc' },
      select: {
        capturedAt: true, inverterId: true, soc: true,
        batChargePower: true, batDischargePower: true, epsPower: true,
        gridConsumptionPower: true, feedinPower: true,
        powerKw: true, generationKwhDay: true, runningState: true,
      },
    });
    res.json({ inicio: dataInicio, fim: dataFim, snapshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Quedas da planta ───────────────────────────────────────────────────────
router.get('/plants/:id/quedas', async (req, res) => {
  const tenantId = req.tenantContext;
  const limite = Math.min(Number(req.query.limite) || 50, 200);
  try {
    const quedas = await prisma.solarOutage.findMany({
      where: { tenantId, plantId: req.params.id },
      orderBy: { inicioEm: 'desc' },
      take: limite,
    });
    res.json(quedas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Falhas da planta (ativas + historico) ──────────────────────────────────
// Fase 1. Query params:
//   status: "ativas" (default) | "resolvidas" | "todas"
//   limite: default 50, max 200
router.get('/plants/:id/falhas', async (req, res) => {
  const tenantId = req.tenantContext;
  const { status = 'ativas', limite } = req.query;
  const take = Math.min(Number(limite) || 50, 200);
  const where = { tenantId, plantId: req.params.id };
  if (status === 'ativas') where.resolvidaEm = null;
  else if (status === 'resolvidas') where.resolvidaEm = { not: null };
  try {
    const falhas = await prisma.solarFalha.findMany({
      where,
      orderBy: { reportadaEm: 'desc' },
      take,
      include: { inverter: { select: { inverterSn: true, modeloInversor: true, provider: true } } },
    });
    res.json(falhas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agregado mensal: lista historico de meses ──────────────────────────────
// Query params: limite (default 12, max 36)
router.get('/plants/:id/agregados-mensais', async (req, res) => {
  const tenantId = req.tenantContext;
  const take = Math.min(Number(req.query.limite) || 12, 36);
  try {
    const agregados = await prisma.solarAgregadoMensal.findMany({
      where: { tenantId, plantId: req.params.id },
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
      take,
    });
    res.json(agregados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agregado diario: lista historico de dias no mes ────────────────────────
// Query params: ano, mes (obrigatorios)
router.get('/plants/:id/agregados-diarios', async (req, res) => {
  const tenantId = req.tenantContext;
  const ano = Number(req.query.ano);
  const mes = Number(req.query.mes);
  if (!ano || !mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'ano e mes (1-12) obrigatorios' });
  }
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  try {
    const agregados = await prisma.solarAgregadoDiario.findMany({
      where: { tenantId, plantId: req.params.id, dia: { gte: inicio, lt: fim } },
      orderBy: { dia: 'asc' },
    });
    res.json(agregados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agregado "este mes" (resumo pro card) ──────────────────────────────────
// Calculo AO VIVO: combina SolarAgregadoDiario (dias fechados pelo cron)
// com snapshots do(s) dia(s) ainda nao agregado(s) — tipicamente hoje. Com
// isso o card atualiza a cada ~1min sem esperar o cron de 02:30 UTC.
router.get('/plants/:id/agregado-mes-atual', async (req, res) => {
  const tenantId = req.tenantContext;
  const hoje = new Date();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;
  try {
    const { calcularResumoMesVivo } = await import('../services/solar/solarAgregadosService.js');
    const resumo = await calcularResumoMesVivo({
      tenantId, plantId: req.params.id, ano, mes,
    });
    if (!resumo) return res.status(404).json({ error: 'Planta nao encontrada' });

    // Enriquece com variacao vs mes anterior (consulta SolarAgregadoMensal
    // — essa SIM precisa estar pronta porque e mes passado).
    const mesAnteriorAno = mes === 1 ? ano - 1 : ano;
    const mesAnteriorMes = mes === 1 ? 12 : mes - 1;
    const anterior = await prisma.solarAgregadoMensal.findUnique({
      where: { tenantId_plantId_ano_mes: {
        tenantId, plantId: req.params.id, ano: mesAnteriorAno, mes: mesAnteriorMes,
      } },
      select: { kwhGerado: true },
    });
    const variacaoKwhMesAnterior = anterior?.kwhGerado && anterior.kwhGerado > 0
      ? (resumo.kwhGerado - anterior.kwhGerado) / anterior.kwhGerado
      : null;

    res.json({ ...resumo, variacaoKwhMesAnterior });
  } catch (err) {
    console.error('[AGREGADO_MES_ATUAL]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper padrao SIMEC pra enviar PDF (ASCII + UTF-8) ─────────────────────
function enviarPdf(res, buffer, fileName) {
  res.setHeader('Content-Type', 'application/pdf');
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  return res.status(200).send(buffer);
}

// ─── PDF de relatorio mensal (legado — mantido pra compat) ───────────────────
router.get('/plants/:id/relatorio-pdf', async (req, res) => {
  const tenantId = req.tenantContext;
  const ano = Number(req.query.ano);
  const mes = Number(req.query.mes);
  if (!ano || !mes) return res.status(400).json({ error: 'ano e mes obrigatorios' });
  try {
    const { gerarRelatorioSolarPdf } = await import('../services/solar/solarRelatorioPdfService.js');
    const { buffer, fileName } = await gerarRelatorioSolarPdf({
      tenantId, plantId: req.params.id, ano, mes,
    });
    return enviarPdf(res, buffer, fileName);
  } catch (err) {
    console.error('[SOLAR_RELATORIO_PDF]', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── PDF de relatorio de producao (periodo livre) ────────────────────────────
// Query: dataInicio, dataFim (YYYY-MM-DD)
router.get('/plants/:id/relatorio-producao-pdf', async (req, res) => {
  const tenantId = req.tenantContext;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: 'dataInicio e dataFim obrigatorios (YYYY-MM-DD)' });
  }
  try {
    const { gerarRelatorioProducaoPdf } = await import('../services/solar/solarRelatorioPdfService.js');
    const { buffer, fileName } = await gerarRelatorioProducaoPdf({
      tenantId, plantId: req.params.id, dataInicio, dataFim,
    });
    return enviarPdf(res, buffer, fileName);
  } catch (err) {
    console.error('[SOLAR_RELATORIO_PRODUCAO_PDF]', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── PDF de relatorio de falhas de inversor (periodo livre) ──────────────────
// Query: dataInicio, dataFim (YYYY-MM-DD), inverterId (opcional pra 1 inv so)
router.get('/plants/:id/relatorio-falhas-pdf', async (req, res) => {
  const tenantId = req.tenantContext;
  const { dataInicio, dataFim, inverterId } = req.query;
  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: 'dataInicio e dataFim obrigatorios (YYYY-MM-DD)' });
  }
  try {
    const { gerarRelatorioFalhasPdf } = await import('../services/solar/solarRelatorioPdfService.js');
    const { buffer, fileName } = await gerarRelatorioFalhasPdf({
      tenantId, plantId: req.params.id, dataInicio, dataFim,
      inverterId: inverterId || null,
    });
    return enviarPdf(res, buffer, fileName);
  } catch (err) {
    console.error('[SOLAR_RELATORIO_FALHAS_PDF]', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
