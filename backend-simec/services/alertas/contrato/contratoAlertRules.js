import {
  buildContratoAlertId,
  montarTituloContratoVencido,
  montarTituloContratoVence,
  montarSubtituloContrato,
} from './contratoAlertFormatter.js';
import { upsertAlertaContrato } from './contratoAlertRepository.js';
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

export async function gerarAlertaVencimentoContrato(
  tenantId,
  contrato,
  agoraUtc,
  timezone
) {
  const dataFimIso =
    contrato?.dataFim instanceof Date
      ? contrato.dataFim.toISOString()
      : String(contrato.dataFim);

  const hojeLocal = extractLocalDateFromIso(
    agoraUtc.toISOString(),
    timezone
  );

  const vencimentoLocal = extractLocalDateFromIso(dataFimIso, timezone);

  if (!hojeLocal || !vencimentoLocal) {
    console.warn(
      `[ALERTA_CONTRATO][${tenantId}] Não foi possível resolver datas locais`
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
    await upsertAlertaContrato(
      tenantId,
      buildContratoAlertId(tenantId, 'contrato-vencido', contrato.id),
      criarPayloadBaseAlerta({
        id: buildContratoAlertId(tenantId, 'contrato-vencido', contrato.id),
        titulo: montarTituloContratoVencido(),
        subtitulo: montarSubtituloContrato(contrato),
        data: contrato.dataFim,
        prioridade: ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.CONTRATO,
        tipoEvento: ALERT_EVENTOS.CONTRATO_VENCIDO,
        link: '/contratos',
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
      await upsertAlertaContrato(
        tenantId,
        buildContratoAlertId(
          tenantId,
          'contrato-vence',
          contrato.id,
          ponto.label
        ),
        criarPayloadBaseAlerta({
          id: buildContratoAlertId(
            tenantId,
            'contrato-vence',
            contrato.id,
            ponto.label
          ),
          titulo: montarTituloContratoVence(ponto.texto),
          subtitulo: montarSubtituloContrato(contrato),
          data: contrato.dataFim,
          prioridade: ponto.prioridade,
          tipoCategoria: ALERT_CATEGORIAS.CONTRATO,
          tipoEvento: ALERT_EVENTOS.CONTRATO_VENCE,
          link: '/contratos',
        })
      );

      return 1;
    }
  }

  return 0;
}