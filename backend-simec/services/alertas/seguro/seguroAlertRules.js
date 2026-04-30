import {
  buildSeguroAlertId,
  montarTituloSeguroVencido,
  montarTituloSeguroVence,
  montarSubtituloSeguro,
  montarTituloSeguroConflito,
  montarSubtituloSeguroConflito,
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

  const hojeLocal      = extractLocalDateFromIso(agoraUtc.toISOString(), timezone);
  const vencimentoLocal = extractLocalDateFromIso(dataFimIso, timezone);

  if (!hojeLocal || !vencimentoLocal) {
    console.warn(`[ALERTA_SEGURO][${tenantId}] Falha ao resolver datas`);
    return 0;
  }

  const diasRestantes = diffLocalDateInDays({
    fromDateLocal: hojeLocal,
    toDateLocal:   vencimentoLocal,
  });

  if (diasRestantes === null) return 0;

  if (diasRestantes <= 0) {
    const alertaId = buildSeguroAlertId(tenantId, 'seguro-vencido', seguro.id);

    await upsertAlertaSeguro(
      tenantId,
      alertaId,
      await criarPayloadBaseAlerta({
        id: alertaId,
        titulo:        montarTituloSeguroVencido(seguro),
        subtitulo:     montarSubtituloSeguro(seguro),
        data:          seguro.dataFim,
        prioridade:    ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.SEGURO,
        tipoEvento:    ALERT_EVENTOS.SEGURO_VENCIDO,
        link:          `/seguros/detalhes/${seguro.id}`,
        contexto:  { seguroId: seguro.id, tenantId },
        metadata:  { diasRestantes, tipo: 'seguro', criticidade: 'Critico' },
      })
    );

    return 1;
  }

  const PONTOS = [
    { limiar: 1,  prioridade: ALERT_PRIORIDADES.ALTA,  label: '1d',  texto: 'amanhã' },
    { limiar: 7,  prioridade: ALERT_PRIORIDADES.ALTA,  label: '7d',  texto: 'em 7 dias' },
    { limiar: 15, prioridade: ALERT_PRIORIDADES.MEDIA, label: '15d', texto: 'em 15 dias' },
    { limiar: 30, prioridade: ALERT_PRIORIDADES.BAIXA, label: '30d', texto: 'em 30 dias' },
  ];

  for (const ponto of PONTOS) {
    if (diasRestantes > 0 && diasRestantes <= ponto.limiar) {
      const alertaId = buildSeguroAlertId(tenantId, 'seguro-vence', seguro.id, ponto.label);

      await upsertAlertaSeguro(
        tenantId,
        alertaId,
        await criarPayloadBaseAlerta({
          id: alertaId,
          titulo:        montarTituloSeguroVence(seguro, ponto.texto),
          subtitulo:     montarSubtituloSeguro(seguro),
          data:          seguro.dataFim,
          prioridade:    ponto.prioridade,
          tipoCategoria: ALERT_CATEGORIAS.SEGURO,
          tipoEvento:    ALERT_EVENTOS.SEGURO_VENCE,
          link:          `/seguros/detalhes/${seguro.id}`,
          contexto:  { seguroId: seguro.id, tenantId },
          metadata: {
            diasRestantes,
            tipo: 'seguro',
            criticidade:
              diasRestantes <= 1  ? 'Critico'  :
              diasRestantes <= 7  ? 'Alto'     :
              diasRestantes <= 15 ? 'Moderado' : 'Baixo',
          },
        })
      );

      return 1;
    }
  }

  return 0;
}

export async function gerarAlertaConflitoCobertura(tenantId, seguroA, seguroB) {
  const [idA, idB] = [seguroA.id, seguroB.id].sort();
  const alertaId = buildSeguroAlertId(tenantId, 'seguro-conflito', `${idA}_${idB}`);

  await upsertAlertaSeguro(
    tenantId,
    alertaId,
    await criarPayloadBaseAlerta({
      id: alertaId,
      titulo:        montarTituloSeguroConflito(seguroA),
      subtitulo:     montarSubtituloSeguroConflito(seguroA, seguroB),
      data:          new Date(),
      prioridade:    ALERT_PRIORIDADES.ALTA,
      tipoCategoria: ALERT_CATEGORIAS.SEGURO,
      tipoEvento:    ALERT_EVENTOS.SEGURO_CONFLITO,
      link:          `/seguros/detalhes/${seguroA.id}`,
      contexto:  { seguroIdA: seguroA.id, seguroIdB: seguroB.id, tenantId },
      metadata:  { tipo: 'seguro', criticidade: 'Alto' },
    })
  );

  return 1;
}
