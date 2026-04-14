// Ficheiro: backend-simec/services/alertas/seguro/seguroAlertRules.js

import {
  buildSeguroAlertId,
  montarTituloSeguroVencido,
  montarTituloSeguroVence,
  montarSubtituloSeguro,
} from './seguroAlertFormatter.js';
import { upsertAlertaSeguro } from './seguroAlertRepository.js';
import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';
import {
  extractLocalDateFromIso,
  diffLocalDateInDays,
} from '../../time/index.js';

export async function gerarAlertaVencimentoSeguro(
  tenantId,
  seguro,
  agoraUtc,
  timezone
) {
  const dataFimIso =
    seguro?.dataFim instanceof Date
      ? seguro.dataFim.toISOString()
      : String(seguro.dataFim);

  const hojeLocal = extractLocalDateFromIso(
    agoraUtc.toISOString(),
    timezone
  );

  const vencimentoLocal = extractLocalDateFromIso(dataFimIso, timezone);

  if (!hojeLocal || !vencimentoLocal) {
    console.warn(
      `[ALERTA_SEGURO][${tenantId}] Não foi possível resolver datas locais`
    );
    return 0;
  }

  const diasRestantes = diffLocalDateInDays({
    fromDateLocal: hojeLocal,
    toDateLocal: vencimentoLocal,
  });

  if (diasRestantes === null) {
    return 0;
  }

  if (diasRestantes <= 0) {
    await upsertAlertaSeguro(
      tenantId,
      buildSeguroAlertId(tenantId, 'seguro-vencido', seguro.id),
      criarPayloadBaseAlerta({
        id: buildSeguroAlertId(tenantId, 'seguro-vencido', seguro.id),
        titulo: montarTituloSeguroVencido(),
        subtitulo: montarSubtituloSeguro(seguro),
        data: seguro.dataFim,
        prioridade: ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.SEGURO,
        tipoEvento: ALERT_EVENTOS.SEGURO_VENCIDO,
        link: '/seguros',
      })
    );

    return 1;
  }

  const PONTOS = [
    { limiar: 1, prioridade: ALERT_PRIORIDADES.ALTA, label: '1d', texto: 'amanhã' },
    { limiar: 7, prioridade: ALERT_PRIORIDADES.ALTA, label: '7d', texto: 'em 7 dias' },
    { limiar: 15, prioridade: ALERT_PRIORIDADES.MEDIA, label: '15d', texto: 'em 15 dias' },
    { limiar: 30, prioridade: ALERT_PRIORIDADES.BAIXA, label: '30d', texto: 'em 30 dias' },
  ];

  for (const ponto of PONTOS) {
    if (diasRestantes > 0 && diasRestantes <= ponto.limiar) {
      await upsertAlertaSeguro(
        tenantId,
        buildSeguroAlertId(tenantId, 'seguro-vence', seguro.id, ponto.label),
        criarPayloadBaseAlerta({
          id: buildSeguroAlertId(tenantId, 'seguro-vence', seguro.id, ponto.label),
          titulo: montarTituloSeguroVence(ponto.texto),
          subtitulo: montarSubtituloSeguro(seguro),
          data: seguro.dataFim,
          prioridade: ponto.prioridade,
          tipoCategoria: ALERT_CATEGORIAS.SEGURO,
          tipoEvento: ALERT_EVENTOS.SEGURO_VENCE,
          link: '/seguros',
        })
      );

      return 1;
    }
  }

  return 0;
}