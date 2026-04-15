// Ficheiro: services/alertas/manutencao/manutencaoAlertRules.js

import {
  montarTituloInicio,
  montarTituloFim,
  montarTituloConfirmacao,
  montarSubtituloConfirmacaoFallback,
  buildAlertId,
  montarPayloadAlertaManutencaoBase,
} from './manutencaoAlertFormatter.js';

import {
  buscarManutencoesAgendadasFuturas,
  buscarManutencoesParaInicioAutomatico,
  buscarManutencoesComFimProximo,
  buscarManutencoesParaConfirmacao,
  upsertAlertaManutencao,
  atualizarStatusParaEmAndamento,
  moverParaAguardandoConfirmacao as moverStatusConfirmacao,
} from './manutencaoAlertRepository.js';

import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';

import { onAlertasProcessados } from '../alertasEventService.js';

export async function gerarAlertasAproximacaoInicio(tenantId, agora) {
  const PONTOS = [
    { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA, label: '10min' },
    { limiar: 60, prioridade: ALERT_PRIORIDADES.MEDIA, label: '1h' },
    { limiar: 1440, prioridade: ALERT_PRIORIDADES.BAIXA, label: '24h' },
  ];

  const manutencoes = await buscarManutencoesAgendadasFuturas(tenantId, agora);
  let total = 0;

  for (const manut of manutencoes) {
    const minRestantes =
      (new Date(manut.dataHoraAgendamentoInicio) - agora) / 60000;

    for (const ponto of PONTOS) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const alertaId = buildAlertId(
          tenantId,
          'manut-prox-inicio',
          manut.id,
          ponto.label
        );

        const result = await upsertAlertaManutencao(
          tenantId,
          alertaId,
          await criarPayloadBaseAlerta({
            id: alertaId,
            titulo: montarTituloInicio(manut),
            ...montarPayloadAlertaManutencaoBase(manut),
            data: manut.dataHoraAgendamentoInicio,
            prioridade: ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
            tipoEvento: ALERT_EVENTOS.MANUT_PROX_INICIO,
            link: `/manutencoes/detalhes/${manut.id}`,
          })
        );

        if (result.created || result.updated) {
          await onAlertasProcessados({ tenantsAfetados: [tenantId] });
          total++;
        }

        break;
      }
    }
  }

  return total;
}

export async function iniciarManutencoesAutomaticamente(tenantId, agora) {
  const manutencoes = await buscarManutencoesParaInicioAutomatico(
    tenantId,
    agora
  );

  let total = 0;

  for (const manut of manutencoes) {
    await atualizarStatusParaEmAndamento(tenantId, manut, agora);

    const alertaId = buildAlertId(tenantId, 'manut-iniciada', manut.id);

    const result = await upsertAlertaManutencao(
      tenantId,
      alertaId,
      await criarPayloadBaseAlerta({
        id: alertaId,
        titulo: montarTituloInicio(manut),
        ...montarPayloadAlertaManutencaoBase(manut),
        data: agora,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
        tipoEvento: ALERT_EVENTOS.MANUT_INICIADA,
        link: `/manutencoes/detalhes/${manut.id}`,
      })
    );

    if (result.created || result.updated) {
      await onAlertasProcessados({ tenantsAfetados: [tenantId] });
      total++;
    }
  }

  return total;
}

export async function gerarAlertasAproximacaoFim(tenantId, agora) {
  const PONTOS = [
    { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA, label: '10min' },
    { limiar: 30, prioridade: ALERT_PRIORIDADES.MEDIA, label: '30min' },
  ];

  const manutencoes = await buscarManutencoesComFimProximo(tenantId, agora);
  let total = 0;

  for (const manut of manutencoes) {
    const minRestantes =
      (new Date(manut.dataHoraAgendamentoFim) - agora) / 60000;

    for (const ponto of PONTOS) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const alertaId = buildAlertId(
          tenantId,
          'manut-prox-fim',
          manut.id,
          ponto.label
        );

        const result = await upsertAlertaManutencao(
          tenantId,
          alertaId,
          await criarPayloadBaseAlerta({
            id: alertaId,
            titulo: montarTituloFim(manut),
            ...montarPayloadAlertaManutencaoBase(manut),
            data: manut.dataHoraAgendamentoFim,
            prioridade: ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
            tipoEvento: ALERT_EVENTOS.MANUT_PROX_FIM,
            link: `/manutencoes/detalhes/${manut.id}`,
          })
        );

        if (result.created || result.updated) {
          await onAlertasProcessados({ tenantsAfetados: [tenantId] });
          total++;
        }

        break;
      }
    }
  }

  return total;
}

export async function moverParaAguardandoConfirmacao(tenantId, agora) {
  const manutencoes = await buscarManutencoesParaConfirmacao(tenantId, agora);

  let total = 0;

  for (const manut of manutencoes) {
    await moverStatusConfirmacao(tenantId, manut);

    const alertaId = buildAlertId(
      tenantId,
      'manut-confirm',
      manut.id
    );

    const result = await upsertAlertaManutencao(
      tenantId,
      alertaId,
      await criarPayloadBaseAlerta({
        id: alertaId,
        titulo: montarTituloConfirmacao(manut),
        subtituloBase: montarSubtituloConfirmacaoFallback(manut),
        ...montarPayloadAlertaManutencaoBase(manut),
        data: agora,
        prioridade: ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
        tipoEvento: ALERT_EVENTOS.MANUT_CONFIRMACAO,
        link: `/manutencoes/detalhes/${manut.id}`,
      })
    );

    if (result.created || result.updated) {
      await onAlertasProcessados({ tenantsAfetados: [tenantId] });
      total++;
    }
  }

  return total;
}