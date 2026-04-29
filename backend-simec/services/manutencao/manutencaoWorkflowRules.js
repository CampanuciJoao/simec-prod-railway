import { extrairLocalDateTimeFromIso } from './manutencaoSchedulingRules.js';

export function validarAcaoWorkflow(acao) {
  return ['concluir', 'prorrogar', 'cancelar', 'agendar_visita', 'resolver_internamente'].includes(acao);
}

export function validarStatusParaAcao({
  statusAtual,
  acao,
}) {
  const status = String(statusAtual || '');

  if (acao === 'agendar_visita') {
    if (status !== 'Pendente') {
      return {
        ok: false,
        status: 409,
        message: `Nao e possivel agendar visita em uma OS com status "${status}". A OS deve estar Pendente.`,
      };
    }
    return { ok: true };
  }

  if (acao === 'resolver_internamente') {
    if (status !== 'Pendente') {
      return {
        ok: false,
        status: 409,
        message: `Nao e possivel resolver internamente uma OS com status "${status}". A OS deve estar Pendente.`,
      };
    }
    return { ok: true };
  }

  if (acao === 'cancelar') {
    const permitidos = ['Agendada', 'EmAndamento', 'AguardandoConfirmacao', 'Pendente'];

    if (!permitidos.includes(status)) {
      return {
        ok: false,
        status: 409,
        message: `Nao e possivel cancelar uma manutencao com status "${status}".`,
      };
    }

    return { ok: true };
  }

  if (acao === 'concluir') {
    const permitidos = ['EmAndamento', 'AguardandoConfirmacao'];

    if (!permitidos.includes(status)) {
      return {
        ok: false,
        status: 409,
        message: `Nao e possivel concluir uma manutencao com status "${status}".`,
      };
    }

    return { ok: true };
  }

  if (acao === 'prorrogar') {
    const permitidos = ['EmAndamento', 'AguardandoConfirmacao'];

    if (!permitidos.includes(status)) {
      return {
        ok: false,
        status: 409,
        message: `Nao e possivel prorrogar uma manutencao com status "${status}".`,
      };
    }

    return { ok: true };
  }

  return {
    ok: false,
    status: 400,
    message: 'Acao operacional invalida.',
  };
}

function validarSelecaoOperacional({
  acao,
  manutencaoRealizada,
  equipamentoOperante,
}) {
  if (acao === 'cancelar') return null;

  if (typeof manutencaoRealizada !== 'boolean') {
    return 'Informe se a manutencao ocorreu mesmo.';
  }

  if (typeof equipamentoOperante !== 'boolean') {
    return 'Informe como o equipamento ficou ao final do prazo.';
  }

  if (acao === 'concluir' && !equipamentoOperante) {
    return 'Se o equipamento continua inoperante, a OS deve ser prorrogada.';
  }

  if (acao === 'prorrogar' && equipamentoOperante) {
    return 'Se o equipamento ficou operante, a OS deve ser concluida.';
  }

  return null;
}

export function montarWorkflowPayload({
  manutencaoAtual,
  acao,
  dataTerminoReal,
  novaPrevisao,
  observacao,
  timezone,
  manutencaoRealizada,
  equipamentoOperante,
  statusEquipamentoAnterior,
  // campos exclusivos de agendar_visita
  agendamentoDataInicioLocal,
  agendamentoHoraInicioLocal,
  agendamentoDataFimLocal,
  agendamentoHoraFimLocal,
  agendamentoStartUtc,
  agendamentoEndUtc,
  numeroChamado,
  tecnicoResponsavel,
}) {
  if (!validarAcaoWorkflow(acao)) {
    return {
      ok: false,
      status: 400,
      message: 'Acao de conclusao invalida.',
    };
  }

  const validacaoStatus = validarStatusParaAcao({
    statusAtual: manutencaoAtual.status,
    acao,
  });

  if (!validacaoStatus.ok) {
    return validacaoStatus;
  }

  // Tratar acoes exclusivas de OS Pendente antes da validacao operacional
  if (acao === 'agendar_visita') {
    const dataFormatada = `${agendamentoDataInicioLocal} ${agendamentoHoraInicioLocal}`;
    const notaTexto = [
      `Visita agendada para ${dataFormatada}.`,
      String(observacao || '').trim(),
    ].filter(Boolean).join(' ');

    return {
      ok: true,
      updateData: {
        status: 'Agendada',
        agendamentoDataInicioLocal,
        agendamentoHoraInicioLocal,
        agendamentoDataFimLocal,
        agendamentoHoraFimLocal,
        agendamentoTimezone: timezone,
        dataHoraAgendamentoInicio: agendamentoStartUtc,
        dataHoraAgendamentoFim: agendamentoEndUtc,
        ...(numeroChamado ? { numeroChamado } : {}),
        ...(tecnicoResponsavel ? { tecnicoResponsavel } : {}),
      },
      detalheLog: `OS ${manutencaoAtual.numeroOS} agendada para ${dataFormatada}. Status: Pendente → Agendada.${tecnicoResponsavel ? ` Técnico: ${tecnicoResponsavel}.` : ''}`,
      notaOperacional: notaTexto,
      equipamentoStatus: null,
      historicoTitulo: `OS ${manutencaoAtual.numeroOS} visita agendada`,
      historicoDescricao: notaTexto,
    };
  }

  if (acao === 'resolver_internamente') {
    if (!String(observacao || '').trim()) {
      return {
        ok: false,
        status: 400,
        message: 'Descreva como o problema foi resolvido.',
      };
    }

    const agora = new Date();
    const notaTexto = `Resolvido internamente sem visita tecnica. ${String(observacao).trim()}`;

    return {
      ok: true,
      updateData: {
        status: 'Concluida',
        dataConclusao: agora,
        dataFimReal: agora,
      },
      detalheLog: `OS ${manutencaoAtual.numeroOS} resolvida internamente. Status: Pendente → Concluída. Resolução: ${String(observacao).trim()}`,
      notaOperacional: notaTexto,
      equipamentoStatus: 'Operante',
      historicoTitulo: `OS ${manutencaoAtual.numeroOS} resolvida internamente`,
      historicoDescricao: notaTexto,
    };
  }

  const erroSelecao = validarSelecaoOperacional({
    acao,
    manutencaoRealizada,
    equipamentoOperante,
  });

  if (erroSelecao) {
    return {
      ok: false,
      status: 400,
      message: erroSelecao,
    };
  }

  const updateData = {};
  let detalheLog = '';
  let notaOperacional = '';
  let equipamentoStatus = null;
  let historicoTitulo = '';
  let historicoDescricao = '';

  if (acao === 'cancelar') {
    if (!String(observacao || '').trim()) {
      return {
        ok: false,
        status: 400,
        message: 'O motivo do cancelamento e obrigatorio.',
      };
    }

    updateData.status = 'Cancelada';
    equipamentoStatus = statusEquipamentoAnterior || null;
    detalheLog = `OS ${manutencaoAtual.numeroOS} cancelada. Status: ${manutencaoAtual.status} → Cancelada. Motivo: ${String(observacao).trim()}`;
    notaOperacional = `Cancelamento registrado. Motivo: ${String(observacao).trim()}`;
    historicoTitulo = `OS ${manutencaoAtual.numeroOS} cancelada`;
    historicoDescricao = [
      notaOperacional,
      equipamentoStatus
        ? `Equipamento retornado para o status ${equipamentoStatus}.`
        : null,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      ok: true,
      updateData,
      detalheLog,
      notaOperacional,
      equipamentoStatus,
      historicoTitulo,
      historicoDescricao,
    };
  }

  if (acao === 'concluir') {
    if (!dataTerminoReal) {
      return {
        ok: false,
        status: 400,
        message: 'A hora real do fim da manutencao e obrigatoria.',
      };
    }

    const parsedConclusao = new Date(dataTerminoReal);

    if (Number.isNaN(parsedConclusao.getTime())) {
      return {
        ok: false,
        status: 400,
        message: 'Hora real de termino invalida.',
      };
    }

    if (!manutencaoRealizada && !String(observacao || '').trim()) {
      return {
        ok: false,
        status: 400,
        message: 'Explique por que a manutencao nao ocorreu.',
      };
    }

    updateData.status = 'Concluida';
    updateData.dataConclusao = parsedConclusao;
    updateData.dataFimReal = parsedConclusao;
    detalheLog = `OS ${manutencaoAtual.numeroOS} concluída. Status: ${manutencaoAtual.status} → Concluída. Manutenção realizada: ${manutencaoRealizada ? 'Sim' : 'Não'}. Equipamento: Operante.${observacao ? ` Obs: ${String(observacao).trim()}` : ''}`;
    equipamentoStatus = 'Operante';
    historicoTitulo = `OS ${manutencaoAtual.numeroOS} concluida`;
    historicoDescricao = [
      `Fim real informado em ${dataTerminoReal}.`,
      manutencaoRealizada
        ? 'A manutencao foi executada e o equipamento ficou operante.'
        : 'A manutencao nao ocorreu, mas o equipamento ficou operante.',
      String(observacao || '').trim(),
    ]
      .filter(Boolean)
      .join(' ');

    notaOperacional = historicoDescricao;

    return {
      ok: true,
      updateData,
      detalheLog,
      notaOperacional,
      equipamentoStatus,
      historicoTitulo,
      historicoDescricao,
    };
  }

  if (!novaPrevisao) {
    return {
      ok: false,
      status: 400,
      message: 'A nova previsao e obrigatoria.',
    };
  }

  if (!String(observacao || '').trim()) {
    return {
      ok: false,
      status: 400,
      message: 'Informe a justificativa da prorrogacao.',
    };
  }

  const parsedPrevisao = new Date(novaPrevisao);

  if (Number.isNaN(parsedPrevisao.getTime())) {
    return {
      ok: false,
      status: 400,
      message: 'Nova previsao invalida.',
    };
  }

  const localPrevisao = extrairLocalDateTimeFromIso(
    novaPrevisao,
    timezone
  );

  if (!localPrevisao) {
    return {
      ok: false,
      status: 400,
      message: 'Nao foi possivel interpretar a nova previsao.',
    };
  }

  updateData.status = 'EmAndamento';
  updateData.agendamentoDataFimLocal = localPrevisao.dateLocal;
  updateData.agendamentoHoraFimLocal = localPrevisao.timeLocal;
  updateData.dataHoraAgendamentoFim = localPrevisao.utcDate;

  detalheLog = `OS ${manutencaoAtual.numeroOS} prorrogada. Status: ${manutencaoAtual.status} → EmAndamento. Nova previsão: ${localPrevisao.dateLocal} ${localPrevisao.timeLocal}. Motivo: ${String(observacao).trim()}`;
  equipamentoStatus = 'EmManutencao';
  historicoTitulo = `OS ${manutencaoAtual.numeroOS} prorrogada`;
  historicoDescricao = [
    manutencaoRealizada
      ? 'A manutencao ocorreu, mas o equipamento continua inoperante.'
      : 'A manutencao nao ocorreu e o equipamento continua inoperante.',
    `Nova previsao: ${localPrevisao.dateLocal} ${localPrevisao.timeLocal}.`,
    String(observacao || '').trim(),
  ]
    .filter(Boolean)
    .join(' ');

  notaOperacional = historicoDescricao;

  return {
    ok: true,
    updateData,
    detalheLog,
    notaOperacional,
    equipamentoStatus,
    historicoTitulo,
    historicoDescricao,
  };
}
