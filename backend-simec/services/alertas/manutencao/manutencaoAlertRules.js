// Ficheiro: services/alertas/manutencao/manutencaoAlertRules.js
// Descrição: regras de geração dos alertas de manutenção

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
  criarAlertaSeNaoExistir,
  iniciarManutencaoAutomaticamente,
  moverManutencaoParaAguardandoConfirmacao,
} from './manutencaoAlertRepository.js';

import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';

export async function gerarAlertasAproximacaoInicio(tenantId, agora) {
  const PONTOS_INICIO = [
    { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA, label: '10min' },
    { limiar: 60, prioridade: ALERT_PRIORIDADES.MEDIA, label: '1h' },
    { limiar: 1440, prioridade: ALERT_PRIORIDADES.BAIXA, label: '24h' },
  ];

  const manutencoes = await buscarManutencoesAgendadasFuturas(tenantId, agora);
  let total = 0;

  for (const manut of manutencoes) {
    const minRestantes = Math.floor(
      (new Date(manut.dataHoraAgendamentoInicio).getTime() - agora.getTime()) /
        60000
    );

    console.log(
      `[ALERTA_MANUT_INICIO][${tenantId}] OS ${manut.numeroOS} | faltam=${minRestantes} min`
    );

    for (const ponto of PONTOS_INICIO) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const criado = await criarAlertaSeNaoExistir(
          tenantId,
          criarPayloadBaseAlerta({
            id: buildAlertId(
              tenantId,
              'manut-prox-inicio',
              manut.id,
              ponto.label
            ),
            titulo: montarTituloInicio(manut),
            ...montarPayloadAlertaManutencaoBase(manut),
            data: manut.dataHoraAgendamentoInicio,
            prioridade: ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
            tipoEvento: ALERT_EVENTOS.MANUT_PROX_INICIO,
            link: `/manutencoes/detalhes/${manut.id}`,
          })
        );

        if (criado) {
          total += 1;
          console.log(
            `[ALERTA_MANUT_INICIO][${tenantId}] Criado ${ponto.label} para OS ${manut.numeroOS}`
          );
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
    const modelo = manut.equipamento?.modelo || 'Equipamento';
    const tag = manut.equipamento?.tag || 'Sem TAG';
    const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';

    await iniciarManutencaoAutomaticamente(
      tenantId,
      manut,
      agora,
      criarPayloadBaseAlerta({
        id: buildAlertId(tenantId, 'manut-iniciada', manut.id),
        titulo: `Manutenção iniciada na unidade de ${unidade}, no equipamento ${modelo} (${tag})`,
        subtituloBase: `OS ${manut.numeroOS} - Iniciada automaticamente.`,
        numeroOS: manut.numeroOS || null,
        dataHoraAgendamentoInicio: manut.dataHoraAgendamentoInicio || null,
        dataHoraAgendamentoFim: manut.dataHoraAgendamentoFim || null,
        data: agora,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
        tipoEvento: ALERT_EVENTOS.MANUT_INICIADA,
        link: `/manutencoes/detalhes/${manut.id}`,
      })
    );

    total += 1;
    console.log(
      `[ALERTA_MANUT_INICIO_AUTO][${tenantId}] OS ${manut.numeroOS} iniciada automaticamente`
    );
  }

  return total;
}

export async function gerarAlertasAproximacaoFim(tenantId, agora) {
  const PONTOS_FIM = [
    { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA, label: '10min' },
    { limiar: 30, prioridade: ALERT_PRIORIDADES.MEDIA, label: '30min' },
  ];

  const manutencoes = await buscarManutencoesComFimProximo(tenantId, agora);
  let total = 0;

  for (const manut of manutencoes) {
    const minRestantes = Math.floor(
      (new Date(manut.dataHoraAgendamentoFim).getTime() - agora.getTime()) /
        60000
    );

    console.log(
      `[ALERTA_MANUT_FIM][${tenantId}] OS ${manut.numeroOS} | status=${manut.status} | faltam=${minRestantes} min`
    );

    for (const ponto of PONTOS_FIM) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const criado = await criarAlertaSeNaoExistir(
          tenantId,
          criarPayloadBaseAlerta({
            id: buildAlertId(tenantId, 'manut-prox-fim', manut.id, ponto.label),
            titulo: montarTituloFim(manut),
            ...montarPayloadAlertaManutencaoBase(manut),
            data: manut.dataHoraAgendamentoFim,
            prioridade: ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
            tipoEvento: ALERT_EVENTOS.MANUT_PROX_FIM,
            link: `/manutencoes/detalhes/${manut.id}`,
          })
        );

        if (criado) {
          total += 1;
          console.log(
            `[ALERTA_MANUT_FIM][${tenantId}] Criado ${ponto.label} para OS ${manut.numeroOS}`
          );
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
    await moverManutencaoParaAguardandoConfirmacao(
      tenantId,
      manut,
      agora,
      criarPayloadBaseAlerta({
        id: buildAlertId(tenantId, 'manut-confirm', manut.id),
        titulo: montarTituloConfirmacao(manut),
        subtituloBase: montarSubtituloConfirmacaoFallback(manut),
        numeroOS: manut.numeroOS || null,
        dataHoraAgendamentoInicio: manut.dataHoraAgendamentoInicio || null,
        dataHoraAgendamentoFim: manut.dataHoraAgendamentoFim || null,
        data: agora,
        prioridade: ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
        tipoEvento: ALERT_EVENTOS.MANUT_CONFIRMACAO,
        link: `/manutencoes/detalhes/${manut.id}`,
      })
    );

    total += 1;
    console.log(
      `[ALERTA_MANUT_CONFIRMACAO][${tenantId}] OS ${manut.numeroOS} movida para AguardandoConfirmacao`
    );
  }

  return total;
}