// Refresh PROATIVO dos tokens Sungrow iSolarCloud.
//
// Problema que resolve: a Sungrow emite access_token com TTL ~48h e
// refresh_token com TTL proprio (nao documentado, parece ~30 dias). O
// adapter antigo so renovava REATIVAMENTE (quando uma chamada caia em
// TOKEN_EXPIRED). Se o SIMEC ficasse horas sem chamar a API Sungrow
// (que acontece com rate limit de 5min + throttle do solar-poll), o
// access_token expirava sem ninguem perceber. Quando a proxima chamada
// vinha, o refresh tentava usar um refresh_token muito antigo e falhava —
// forcando o usuario a re-autorizar OAuth no painel.
//
// Doc oficial iSolarCloud (Secao 2.2) recomenda explicitamente:
// **"renovar proativamente (ex. quando faltar <1h para expires_in);
// sempre persistir o novo refresh_token"**.
//
// Este servico roda diariamente (02:00 UTC) e renova TODOS os Sungrow
// ativos, mantendo credentials sempre frescas. Se um refresh_token
// morreu de verdade, dispara um alerta claro pedindo re-autorizacao.

import prisma from '../prismaService.js';
import * as sungrowAdapter from './adapters/sungrowAdapter.js';
import { decryptCredential, encryptCredential } from './solarCrypto.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { linkMonitoramentoSolar } from './solarAlertRepository.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

// Threshold pra decidir se vale a pena renovar: se o access_token ainda
// tem >=24h de vida, pulamos (ja esta fresco). Isso evita gastar 1
// chamada de refresh por inverter todo dia se o token foi acabado de
// renovar por outra via (ex: OAuth reative).
const MARGEM_RENOVACAO_MS = 24 * 60 * 60 * 1000;

async function emitirAlertaReautorizar({ tenantId, inverter, erro }) {
  const alertaId = buildAlertId(
    tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, inverter.id, 'sungrow-reautorizar'
  );
  const subtitulo =
    `Refresh token Sungrow (inverter ${inverter.inverterSn}) expirou. ` +
    `Abra Gerenciamento > Integracoes > Energia Solar e clique em ` +
    `"Autorizar Sungrow" pra re-autorizar OAuth. ` +
    `Ate la, o monitoramento deste inverter fica parado. Motivo: ${erro.slice(0, 200)}`;
  await prisma.alerta.upsert({
    where: { tenantId_id: { tenantId, id: alertaId } },
    create: {
      id: alertaId, tenantId,
      titulo: `Sungrow precisa re-autorizar — ${inverter.inverterSn}`,
      subtitulo, data: new Date(),
      prioridade: ALERT_PRIORIDADES.ALTA,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento: ALERT_EVENTOS.FOXESS_MONITORAMENTO_PARADO,
      link: linkMonitoramentoSolar(inverter.plantId),
    },
    update: {
      subtitulo, data: new Date(),
      prioridade: ALERT_PRIORIDADES.ALTA,
    },
  });
  await publicarContagemAlertasParaTenant({ tenantId }).catch(() => {});
}

async function limparAlertaReautorizar({ tenantId, inverterId }) {
  const alertaId = buildAlertId(
    tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, inverterId, 'sungrow-reautorizar'
  );
  const { count } = await prisma.alerta.deleteMany({
    where: { tenantId, id: alertaId },
  });
  if (count > 0) await publicarContagemAlertasParaTenant({ tenantId }).catch(() => {});
}

// Agrupa inverters que compartilham credencial OAuth Sungrow.
// Sungrow emite 1 par (access_token, refresh_token) por Application — se
// o usuario autorizou a MESMA Application pra 2+ inverters (ex: planta
// logica 1161721 cobre RM + SEDE como se fossem uma so), eles dividem o
// mesmo par. E a cada refresh a Sungrow ROTACIONA o refresh_token: o
// antigo e invalidado. Sem agrupar, o primeiro refresh do loop rouba o
// token e o segundo cai em result_data.code=-2 (expired).
// Chave do grupo: appkey + refreshToken atual.
function agruparPorCredencial(inverters) {
  const grupos = new Map();
  const fora = [];
  for (const inv of inverters) {
    let credential;
    try { credential = decryptCredential(inv.credentialCrypt); }
    catch { fora.push({ inverter: inv, motivo: 'credencial-invalida' }); continue; }
    if (!credential) {
      fora.push({ inverter: inv, motivo: 'credencial-invalida' });
      continue;
    }
    if (!credential.refreshToken || !credential.appkey) {
      // Sem refresh_token nao da pra renovar — provavel OAuth incompleto.
      // Nao emite alerta aqui — o poll ja vai alertar via watchdog.
      fora.push({ inverter: inv, motivo: 'sem-refresh-token' });
      continue;
    }
    const chave = `${credential.appkey}::${credential.refreshToken}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push({ inverter: inv, credential });
  }
  return { grupos, fora };
}

async function aplicarNovoCredencialNoGrupo(grupo, novo) {
  for (const { inverter, credential } of grupo) {
    const novoCredential = {
      ...credential,
      accessToken: novo.accessToken,
      refreshToken: novo.refreshToken,
      expiresAt: Date.now() + novo.expiresIn * 1000,
    };
    await prisma.solarInverter.update({
      where: { id: inverter.id },
      data: { credentialCrypt: encryptCredential(novoCredential) },
    });
    await limparAlertaReautorizar({
      tenantId: inverter.tenantId, inverterId: inverter.id,
    });
  }
}

async function alertarGrupoFalhou(grupo, erro) {
  for (const { inverter } of grupo) {
    await emitirAlertaReautorizar({
      tenantId: inverter.tenantId, inverter, erro,
    });
  }
}

export async function refreshTokensSungrow() {
  const inverters = await prisma.solarInverter.findMany({
    where: { ativo: true, provider: 'sungrow', plant: { ativo: true } },
    select: {
      id: true, tenantId: true, plantId: true, apiBase: true,
      inverterSn: true, credentialCrypt: true,
    },
  });
  if (inverters.length === 0) return { total: 0, grupos: 0, resultados: [] };

  const { grupos, fora } = agruparPorCredencial(inverters);

  const resultados = [];
  for (const { inverter, motivo } of fora) {
    resultados.push({ sn: inverter.inverterSn, inverterId: inverter.id, resultado: motivo });
  }

  for (const grupo of grupos.values()) {
    const sns = grupo.map((g) => g.inverter.inverterSn).join(', ');
    const primeiro = grupo[0];
    // Expiracao e identica no grupo (compartilham tudo). Pula se ainda fresco.
    const expiresAt = Number(primeiro.credential.expiresAt || 0);
    if (expiresAt && (expiresAt - Date.now()) > MARGEM_RENOVACAO_MS) {
      for (const g of grupo) {
        resultados.push({ sn: g.inverter.inverterSn, inverterId: g.inverter.id, resultado: 'fresco' });
      }
      continue;
    }
    try {
      const novo = await sungrowAdapter.refreshAccessToken({
        apiBase: primeiro.inverter.apiBase,
        appkey: primeiro.credential.appkey,
        secretKey: primeiro.credential.secretKey,
        refreshToken: primeiro.credential.refreshToken,
      });
      await aplicarNovoCredencialNoGrupo(grupo, novo);
      for (const g of grupo) {
        resultados.push({
          sn: g.inverter.inverterSn, inverterId: g.inverter.id,
          resultado: 'renovado', novoExpiresEmMs: novo.expiresIn * 1000,
          tamanhoGrupo: grupo.length,
        });
      }
      console.log(
        `[SUNGROW_REFRESH] Grupo (${grupo.length} inv): [${sns}] renovado — ` +
        `novo access_token valido por ${Math.round(novo.expiresIn / 3600)}h.`
      );
    } catch (err) {
      await alertarGrupoFalhou(grupo, err.message);
      for (const g of grupo) {
        resultados.push({
          sn: g.inverter.inverterSn, inverterId: g.inverter.id,
          resultado: 'falhou', erro: err.message, tamanhoGrupo: grupo.length,
        });
      }
      console.warn(`[SUNGROW_REFRESH] Grupo (${grupo.length} inv): [${sns}] FALHOU — ${err.message}`);
    }
  }

  return { total: inverters.length, grupos: grupos.size, resultados };
}

// Usado pelo caminho REATIVO (solarPoller). Quando um refresh ad-hoc
// acontece durante um poll, propaga o novo par pra todos os inverters
// irmaos que compartilhavam o refresh_token antigo — senao, no proximo
// poll eles vao tentar usar o refresh_token que a Sungrow acabou de
// invalidar e cair em "re-autorizar".
export async function propagarCredencialSungrow({
  exceptInverterId, appkey, refreshTokenAntigo, accessTokenNovo, refreshTokenNovo, expiresAtNovo,
}) {
  if (!appkey || !refreshTokenAntigo) return { propagados: 0 };
  const candidatos = await prisma.solarInverter.findMany({
    where: {
      provider: 'sungrow',
      ativo: true,
      ...(exceptInverterId ? { NOT: { id: exceptInverterId } } : {}),
    },
    select: { id: true, tenantId: true, credentialCrypt: true, inverterSn: true },
  });
  let propagados = 0;
  for (const c of candidatos) {
    let cred;
    try { cred = decryptCredential(c.credentialCrypt); } catch { continue; }
    if (!cred) continue;
    if (cred.appkey !== appkey) continue;
    if (cred.refreshToken !== refreshTokenAntigo) continue;
    const novoCred = {
      ...cred,
      accessToken: accessTokenNovo,
      refreshToken: refreshTokenNovo,
      expiresAt: expiresAtNovo,
    };
    try {
      await prisma.solarInverter.update({
        where: { id: c.id },
        data: { credentialCrypt: encryptCredential(novoCred) },
      });
      await limparAlertaReautorizar({ tenantId: c.tenantId, inverterId: c.id });
      propagados++;
      console.log(`[SUNGROW_REFRESH] Credencial propagada para inverter irmao ${c.inverterSn}`);
    } catch (err) {
      console.warn(`[SUNGROW_REFRESH] Falha ao propagar para ${c.inverterSn}: ${err.message}`);
    }
  }
  return { propagados };
}
