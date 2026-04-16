import { extrairLocalDateTimeFromIso } from './manutencaoSchedulingRules.js';

export function validarAcaoWorkflow(acao) {
  return ['concluir', 'prorrogar', 'cancelar'].includes(acao);
}

export function validarStatusParaAcao({
  statusAtual,
  acao,
}) {
  const status = String(statusAtual || '');

  if (acao === 'cancelar') {
    const permitidos = ['Agendada', 'EmAndamento', 'AguardandoConfirmacao'];

    if (!permitidos.includes(status)) {
      return {
        ok: false,
        status: 409,
        message: `Não é possível cancelar uma manutenção com status "${status}".`,
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
        message: `Não é possível concluir uma manutenção com status "${status}".`,
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
        message: `Não é possível prorrogar uma manutenção com status "${status}".`,
      };
    }

    return { ok: true };
  }

  return {
    ok: false,
    status: 400,
    message: 'Ação operacional inválida.',
  };
}

export function montarWorkflowPayload({
  manutencaoAtual,
  acao,
  dataTerminoReal,
  novaPrevisao,
  observacao,
  timezone,
}) {
  if (!validarAcaoWorkflow(acao)) {
    return {
      ok: false,
      status: 400,
      message: 'Ação de conclusão inválida.',
    };
  }

  const validacaoStatus = validarStatusParaAcao({
    statusAtual: manutencaoAtual.status,
    acao,
  });

  if (!validacaoStatus.ok) {
    return validacaoStatus;
  }

  const updateData = {};
  let detalheLog = '';
  let notaOperacional = '';

  if (acao === 'cancelar') {
    if (!String(observacao || '').trim()) {
      return {
        ok: false,
        status: 400,
        message: 'O motivo do cancelamento é obrigatório.',
      };
    }

    updateData.status = 'Cancelada';
    detalheLog = `OS ${manutencaoAtual.numeroOS} cancelada.`;
    notaOperacional = `Cancelamento registrado. Motivo: ${String(observacao).trim()}`;

    return {
      ok: true,
      updateData,
      detalheLog,
      notaOperacional,
    };
  }

  if (acao === 'concluir') {
    if (!dataTerminoReal) {
      return {
        ok: false,
        status: 400,
        message: 'A data/hora real da conclusão é obrigatória.',
      };
    }

    const parsedConclusao = new Date(dataTerminoReal);

    if (Number.isNaN(parsedConclusao.getTime())) {
      return {
        ok: false,
        status: 400,
        message: 'Data/hora real da conclusão inválida.',
      };
    }

    updateData.status = 'Concluida';
    updateData.dataConclusao = parsedConclusao;

    detalheLog = `OS ${manutencaoAtual.numeroOS} concluída.`;

    notaOperacional = [
      `Conclusão registrada em ${dataTerminoReal}.`,
      String(observacao || '').trim(),
    ]
      .filter(Boolean)
      .join(' ');

    return {
      ok: true,
      updateData,
      detalheLog,
      notaOperacional,
    };
  }

  if (acao === 'prorrogar') {
    if (!novaPrevisao) {
      return {
        ok: false,
        status: 400,
        message: 'A nova previsão é obrigatória.',
      };
    }

    const parsedPrevisao = new Date(novaPrevisao);

    if (Number.isNaN(parsedPrevisao.getTime())) {
      return {
        ok: false,
        status: 400,
        message: 'Nova previsão inválida.',
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
        message: 'Não foi possível interpretar a nova previsão.',
      };
    }

    updateData.status = 'EmAndamento';
    updateData.agendamentoDataLocal = localPrevisao.dateLocal;
    updateData.agendamentoHoraFimLocal = localPrevisao.timeLocal;
    updateData.dataHoraAgendamentoFim = localPrevisao.utcDate;

    detalheLog = `OS ${manutencaoAtual.numeroOS} prorrogada.`;

    notaOperacional = [
      `Prorrogação registrada. Nova previsão: ${localPrevisao.dateLocal} ${localPrevisao.timeLocal}.`,
      String(observacao || '').trim(),
    ]
      .filter(Boolean)
      .join(' ');

    return {
      ok: true,
      updateData,
      detalheLog,
      notaOperacional,
    };
  }

  return {
    ok: false,
    status: 400,
    message: 'Ação operacional inválida.',
  };
}