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
router.get('/sungrow/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

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

  try {
    // Sungrow NAO devolve state no callback. O pareamento code <-> inverter
    // e feito via Redis: a rota authorize-url salva o inverterId pendente
    // com TTL 10min. Pegamos o mais recente (unica autorizacao por vez por
    // tenant — ok pra escala atual).
    const redisConnection = getRedisConnection();
    if (!redisConnection) throw new Error('Redis indisponivel');

    const inverterId = await redisConnection.get('sungrow:pending-authorize');
    if (!inverterId) {
      throw new Error('Nenhuma autorizacao pendente. Clique "Autorizar" no SIMEC novamente e tente de novo.');
    }
    await redisConnection.del('sungrow:pending-authorize');

    const inverter = await prisma.solarInverter.findFirst({
      where: { id: inverterId, provider: 'sungrow' },
      select: { id: true, apiBase: true, credentialCrypt: true, tenantId: true },
    });
    if (!inverter) throw new Error('inverter nao encontrado');

    const credential = decryptCredential(inverter.credentialCrypt) || {};

    // IMPORTANTE: o redirect_uri precisa ser EXATAMENTE o mesmo que foi
    // passado na authorize URL (e registrado no portal Sungrow). Senao
    // a Sungrow rejeita a troca do code por token.
    const redirectUri = 'https://simec.cerdil.com.br/api/solar/sungrow/callback';
    console.log('[SUNGROW_OAUTH_CALLBACK] trocando code por token', {
      inverterId,
      codeLen: String(code).length,
      apiBase: inverter.apiBase,
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
      data: { credentialCrypt: encryptCredential(novaCredencial) },
    });

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
    return res.status(400).send(htmlResposta('Falha na autorizacao', err.message, false));
  }
});

router.use(proteger);

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
    temBateria, autonomiaHoras,
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

    // Salva inverterId no Redis com TTL 10min pro callback poder parear
    const redisConnection = getRedisConnection();
    if (!redisConnection) {
      return res.status(500).json({ error: 'Redis indisponivel' });
    }
    await redisConnection.set('sungrow:pending-authorize', inverter.id, 'EX', 600);

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
      select: { id: true, credentialCrypt: true },
    });
    if (!inverter) return res.status(404).json({ error: 'Inverter nao encontrado' });
    const cred = decryptCredential(inverter.credentialCrypt) || {};
    const autorizado = Boolean(cred.accessToken);
    const expiresAt = cred.expiresAt || null;
    res.json({
      autorizado,
      expiresAt,
      precisaRenovar: autorizado && expiresAt && expiresAt < Date.now(),
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

export default router;
