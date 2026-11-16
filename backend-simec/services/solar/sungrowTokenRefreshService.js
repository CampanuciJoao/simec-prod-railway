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

async function renovarUm(inverter) {
  const credential = decryptCredential(inverter.credentialCrypt);
  if (!credential) {
    return { inverterId: inverter.id, resultado: 'credencial-invalida' };
  }
  if (!credential.refreshToken) {
    // Sem refresh_token nao da pra renovar — provavel OAuth incompleto.
    // Nao emite alerta aqui — o poll ja vai alertar que o inverter esta
    // parado pelo caminho normal (watchdog).
    return { inverterId: inverter.id, resultado: 'sem-refresh-token' };
  }

  // Se expira em >24h, pula — token ainda fresco.
  const expiresAt = Number(credential.expiresAt || 0);
  if (expiresAt && (expiresAt - Date.now()) > MARGEM_RENOVACAO_MS) {
    return { inverterId: inverter.id, resultado: 'fresco' };
  }

  try {
    const novo = await sungrowAdapter.refreshAccessToken({
      apiBase: inverter.apiBase,
      appkey: credential.appkey,
      secretKey: credential.secretKey,
      refreshToken: credential.refreshToken,
    });
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
    // Se tinha alerta de re-autorizacao pendente, limpa.
    await limparAlertaReautorizar({
      tenantId: inverter.tenantId, inverterId: inverter.id,
    });
    return { inverterId: inverter.id, resultado: 'renovado', novoExpiresEmMs: novo.expiresIn * 1000 };
  } catch (err) {
    // Se o refresh falhou, o inverter vai parar de atualizar. Alerta claro
    // pro usuario re-autorizar.
    await emitirAlertaReautorizar({
      tenantId: inverter.tenantId, inverter, erro: err.message,
    });
    return { inverterId: inverter.id, resultado: 'falhou', erro: err.message };
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
  if (inverters.length === 0) return { total: 0, resultados: [] };

  const resultados = [];
  for (const inv of inverters) {
    try {
      const r = await renovarUm(inv);
      resultados.push({ sn: inv.inverterSn, ...r });
      if (r.resultado === 'renovado') {
        console.log(`[SUNGROW_REFRESH] Inverter ${inv.inverterSn} renovado (novo access_token valido por ${Math.round(r.novoExpiresEmMs / 3600000)}h).`);
      } else if (r.resultado === 'falhou') {
        console.warn(`[SUNGROW_REFRESH] Inverter ${inv.inverterSn} FALHOU — precisa re-autorizar: ${r.erro}`);
      }
    } catch (err) {
      console.error(`[SUNGROW_REFRESH] Erro inesperado no inverter ${inv.id}:`, err);
      resultados.push({ inverterId: inv.id, sn: inv.inverterSn, resultado: 'erro', erro: err.message });
    }
  }

  return { total: inverters.length, resultados };
}
