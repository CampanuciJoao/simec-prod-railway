import { registrarLog } from '../logService.js';
import {
  adaptarListaManutencoesResponse,
  adaptarManutencaoResponse,
} from '../manutencaoResponseAdapter.js';

import {
  buscarContextoOperacional,
  buscarManutencaoPorId,
  buscarManutencaoResumo,
  listarManutencoes,
  contarManutencoesDoTenant,
  existeConflitoAgendamento,
  criarManutencao,
  atualizarManutencao,
  criarNotaAndamento,
  buscarManutencaoComAnexos,
  deletarManutencao,
} from './manutencaoRepository.js';

import {
  montarMensagemErroAgendamento,
  validarAgendamento,
  gerarNumeroOS,
  montarPayloadPersistencia,
} from './manutencaoSchedulingRules.js';

import {
  montarWorkflowPayload,
  validarAcaoWorkflow,
} from './manutencaoWorkflowRules.js';

export async function listarManutencoesService({
  tenantId,
  filters,
}) {
  const manutencoes = await listarManutencoes({
    tenantId,
    equipamentoId: filters?.equipamentoId,
    unidadeId: filters?.unidadeId,
    tipo: filters?.tipo,
    status: filters?.status,
  });

  return adaptarListaManutencoesResponse(manutencoes);
}

export async function obterManutencaoDetalhadaService({
  tenantId,
  manutencaoId,
}) {
  const manutencao = await buscarManutencaoPorId({
    tenantId,
    manutencaoId,
  });

  if (!manutencao) {
    return {
      ok: false,
      status: 404,
      message: 'Manutenção não encontrada.',
    };
  }

  return {
    ok: true,
    data: adaptarManutencaoResponse(manutencao),
  };
}

export async function criarManutencaoService({
  tenantId,
  usuarioId,
  dados,
}) {
  const contexto = await buscarContextoOperacional({
    tenantId,
    equipamentoId: dados.equipamentoId,
  });

  if (!contexto.ok) {
    return contexto;
  }

  const agendamento = validarAgendamento({
    dateLocal: dados.agendamentoDataLocal,
    startTimeLocal: dados.agendamentoHoraInicioLocal,
    endTimeLocal: dados.agendamentoHoraFimLocal || null,
    timezone: contexto.timezone,
  });

  if (!agendamento.valid) {
    return {
      ok: false,
      status: 400,
      message: montarMensagemErroAgendamento(agendamento.code),
    };
  }

  const conflito = await existeConflitoAgendamento({
    tenantId,
    equipamentoId: dados.equipamentoId,
    startUtc: agendamento.startUtc,
    endUtc: agendamento.endUtc,
  });

  if (conflito) {
    return {
      ok: false,
      status: 409,
      message: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}.`,
      conflito,
    };
  }

  const totalTenant = await contarManutencoesDoTenant(tenantId);

  const numeroOS = gerarNumeroOS({
    tipo: dados.tipo,
    tag: contexto.equipamento.tag,
    sequencia: totalTenant + 1,
  });

  const payload = montarPayloadPersistencia({
    dados,
    agendamento,
    tenantId,
    equipamentoId: dados.equipamentoId,
    numeroOS,
  });

  const nova = await criarManutencao(payload);

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'Manutenção',
    entidadeId: nova.id,
    detalhes: `OS ${numeroOS} criada.`,
  });

  return {
    ok: true,
    status: 201,
    data: adaptarManutencaoResponse(nova),
  };
}

export async function atualizarManutencaoService({
  tenantId,
  usuarioId,
  manutencaoId,
  dados,
}) {
  const manutencaoAtual = await buscarManutencaoResumo({
    tenantId,
    manutencaoId,
  });

  if (!manutencaoAtual) {
    return {
      ok: false,
      status: 404,
      message: 'Manutenção não encontrada.',
    };
  }

  const contexto = await buscarContextoOperacional({
    tenantId,
    equipamentoId: dados.equipamentoId,
  });

  if (!contexto.ok) {
    return contexto;
  }

  const agendamento = validarAgendamento({
    dateLocal: dados.agendamentoDataLocal,
    startTimeLocal: dados.agendamentoHoraInicioLocal,
    endTimeLocal: dados.agendamentoHoraFimLocal || null,
    timezone: contexto.timezone,
  });

  if (!agendamento.valid) {
    return {
      ok: false,
      status: 400,
      message: montarMensagemErroAgendamento(agendamento.code),
    };
  }

  const conflito = await existeConflitoAgendamento({
    tenantId,
    equipamentoId: dados.equipamentoId,
    startUtc: agendamento.startUtc,
    endUtc: agendamento.endUtc,
    manutencaoIdIgnorar: manutencaoId,
  });

  if (conflito) {
    return {
      ok: false,
      status: 409,
      message: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}.`,
      conflito,
    };
  }

  const payload = montarPayloadPersistencia({
    dados,
    agendamento,
    tenantId,
    equipamentoId: dados.equipamentoId,
    numeroOSExistente: manutencaoAtual.numeroOS,
  });

  const atualizada = await atualizarManutencao({
    tenantId,
    manutencaoId,
    payload,
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'Manutenção',
    entidadeId: atualizada.id,
    detalhes: `OS ${atualizada.numeroOS} atualizada.`,
  });

  return {
    ok: true,
    data: adaptarManutencaoResponse(atualizada),
  };
}

export async function adicionarNotaManutencaoService({
  tenantId,
  usuarioId,
  manutencaoId,
  nota,
}) {
  if (!nota) {
    return {
      ok: false,
      status: 400,
      message: 'A nota é obrigatória.',
    };
  }

  const manutencao = await buscarManutencaoResumo({
    tenantId,
    manutencaoId,
  });

  if (!manutencao) {
    return {
      ok: false,
      status: 404,
      message: 'Manutenção não encontrada.',
    };
  }

  const nova = await criarNotaAndamento({
    tenantId,
    usuarioId,
    manutencaoId,
    nota,
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'NotaAndamento',
    entidadeId: nova.id,
    detalhes: `Nota adicionada à OS ${manutencao.numeroOS}.`,
  });

  return {
    ok: true,
    status: 201,
    data: nova,
  };
}

export async function concluirManutencaoComAcaoService({
  tenantId,
  usuarioId,
  manutencaoId,
  acao,
  dataTerminoReal,
  novaPrevisao,
  observacao,
}) {
  if (!validarAcaoWorkflow(acao)) {
    return {
      ok: false,
      status: 400,
      message: 'Ação de conclusão inválida.',
    };
  }

  const manutencaoAtual = await buscarManutencaoResumo({
    tenantId,
    manutencaoId,
  });

  if (!manutencaoAtual) {
    return {
      ok: false,
      status: 404,
      message: 'Manutenção não encontrada.',
    };
  }

  const contexto = await buscarContextoOperacional({
    tenantId,
    equipamentoId: manutencaoAtual.equipamentoId,
  });

  if (!contexto.ok) {
    return contexto;
  }

  const workflow = montarWorkflowPayload({
    manutencaoAtual,
    acao,
    dataTerminoReal,
    novaPrevisao,
    observacao,
    timezone: contexto.timezone,
  });

  if (!workflow.ok) {
    return workflow;
  }

  await atualizarManutencao({
    tenantId,
    manutencaoId,
    payload: workflow.updateData,
  });

  if (workflow.notaOperacional) {
    await criarNotaAndamento({
      tenantId,
      usuarioId,
      manutencaoId,
      nota: workflow.notaOperacional,
    });
  }

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'Manutenção',
    entidadeId: manutencaoId,
    detalhes: workflow.detalheLog,
  });

  const respostaFinal = await buscarManutencaoPorId({
    tenantId,
    manutencaoId,
  });

  return {
    ok: true,
    data: adaptarManutencaoResponse(respostaFinal),
  };
}

export async function excluirManutencaoService({
  tenantId,
  usuarioId,
  manutencaoId,
}) {
  const manut = await buscarManutencaoComAnexos({
    tenantId,
    manutencaoId,
  });

  if (!manut) {
    return {
      ok: false,
      status: 404,
      message: 'Manutenção não encontrada.',
    };
  }

  return {
    ok: true,
    manut,
  };
}