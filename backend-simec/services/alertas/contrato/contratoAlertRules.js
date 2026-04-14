import { differenceInDays, isAfter, startOfDay } from 'date-fns';
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

export async function gerarAlertaVencimentoContrato(tenantId, contrato, hoje) {
  const dataDeVencimento = startOfDay(new Date(contrato.dataFim));

  // vencido ou vence hoje
  if (!isAfter(dataDeVencimento, hoje)) {
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

  const diasRestantes = differenceInDays(dataDeVencimento, hoje);

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