import {
  montarTituloProximidadeInicio,
  montarTituloInicio,
  montarTituloProximidadeFim,
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
  batchUpsertAlertasManutencao,
  atualizarStatusParaEmAndamento,
  moverParaAguardandoConfirmacao as moverStatusConfirmacao,
} from './manutencaoAlertRepository.js';

import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';

export async function gerarAlertasAproximacaoInicio(tenantId, agora) {
  const PONTOS = [
    { limiar: 10,   prioridade: ALERT_PRIORIDADES.ALTA,  label: '10min' },
    { limiar: 60,   prioridade: ALERT_PRIORIDADES.MEDIA, label: '1h' },
    { limiar: 1440, prioridade: ALERT_PRIORIDADES.BAIXA, label: '24h' },
  ];

  const manutencoes = await buscarManutencoesAgendadasFuturas(tenantId, agora);

  const itens = manutencoes.flatMap((manut) => {
    const minRestantes = (new Date(manut.dataHoraAgendamentoInicio) - agora) / 60000;
    for (const ponto of PONTOS) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const alertaId = buildAlertId(tenantId, 'manut-prox-inicio', manut.id, ponto.label);
        return [{
          alertaId,
          data: criarPayloadBaseAlerta({
            id: alertaId,
            titulo:        montarTituloProximidadeInicio(manut, ponto.limiar),
            ...montarPayloadAlertaManutencaoBase(manut),
            data:          manut.dataHoraAgendamentoInicio,
            prioridade:    ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
            tipoEvento:    ALERT_EVENTOS.MANUT_PROX_INICIO,
            link:          `/manutencoes/detalhes/${manut.id}`,
          }),
        }];
      }
    }
    return [];
  });

  return batchUpsertAlertasManutencao(tenantId, itens);
}

export async function iniciarManutencoesAutomaticamente(tenantId, agora) {
  const manutencoes = await buscarManutencoesParaInicioAutomatico(tenantId, agora);

  await Promise.all(manutencoes.map((manut) => atualizarStatusParaEmAndamento(tenantId, manut, agora)));

  const itens = manutencoes.map((manut) => {
    const alertaId = buildAlertId(tenantId, 'manut-iniciada', manut.id);
    return {
      alertaId,
      data: criarPayloadBaseAlerta({
        id: alertaId,
        titulo:        montarTituloInicio(manut),
        ...montarPayloadAlertaManutencaoBase(manut),
        data:          agora,
        prioridade:    ALERT_PRIORIDADES.MEDIA,
        tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
        tipoEvento:    ALERT_EVENTOS.MANUT_INICIADA,
        link:          `/manutencoes/detalhes/${manut.id}`,
      }),
    };
  });

  return batchUpsertAlertasManutencao(tenantId, itens);
}

export async function gerarAlertasAproximacaoFim(tenantId, agora) {
  const PONTOS = [
    { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA,  label: '10min' },
    { limiar: 30, prioridade: ALERT_PRIORIDADES.MEDIA, label: '30min' },
  ];

  const manutencoes = await buscarManutencoesComFimProximo(tenantId, agora);

  const itens = manutencoes.flatMap((manut) => {
    const minRestantes = (new Date(manut.dataHoraAgendamentoFim) - agora) / 60000;
    for (const ponto of PONTOS) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const alertaId = buildAlertId(tenantId, 'manut-prox-fim', manut.id, ponto.label);
        return [{
          alertaId,
          data: criarPayloadBaseAlerta({
            id: alertaId,
            titulo:        montarTituloProximidadeFim(manut, ponto.limiar),
            ...montarPayloadAlertaManutencaoBase(manut),
            data:          manut.dataHoraAgendamentoFim,
            prioridade:    ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
            tipoEvento:    ALERT_EVENTOS.MANUT_PROX_FIM,
            link:          `/manutencoes/detalhes/${manut.id}`,
          }),
        }];
      }
    }
    return [];
  });

  return batchUpsertAlertasManutencao(tenantId, itens);
}

export async function moverParaAguardandoConfirmacao(tenantId, agora) {
  const manutencoes = await buscarManutencoesParaConfirmacao(tenantId, agora);

  await Promise.all(manutencoes.map((manut) => moverStatusConfirmacao(tenantId, manut)));

  const itens = manutencoes.map((manut) => {
    const alertaId = buildAlertId(tenantId, 'manut-confirm', manut.id);
    return {
      alertaId,
      data: criarPayloadBaseAlerta({
        id: alertaId,
        titulo:        montarTituloConfirmacao(manut),
        ...montarPayloadAlertaManutencaoBase(manut),
        subtitulo:     montarSubtituloConfirmacaoFallback(manut),
        data:          agora,
        prioridade:    ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
        tipoEvento:    ALERT_EVENTOS.MANUT_CONFIRMACAO,
        link:          `/manutencoes/detalhes/${manut.id}`,
      }),
    };
  });

  return batchUpsertAlertasManutencao(tenantId, itens);
}
