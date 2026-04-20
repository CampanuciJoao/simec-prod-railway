import { registrarLog } from '../logService.js';
import prisma from '../prismaService.js';
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
  registrarEventoManutencao,
  buscarStatusAnteriorEquipamento,
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
import {
  processarAlertasManutencaoDoTenant,
} from '../alertas/manutencao/index.js';
import { registrarEventoHistoricoAtivo } from '../historicoAtivoService.js';

async function reprocessarAlertasManutencaoSemBloquear(tenantId) {
  try {
    await processarAlertasManutencaoDoTenant(tenantId);
  } catch (error) {
    console.error(
      `[MANUTENCAO_ALERTAS_REPROCESS_ERROR] tenantId=${tenantId}`,
      error
    );
  }
}

function descricaoHistoricoManutencao({
  manutencao,
  contexto,
  observacao = null,
}) {
  const partes = [
    `Tipo ${manutencao.tipo}.`,
    `Equipamento ${contexto.equipamento.modelo} (${contexto.equipamento.tag}).`,
    `Unidade ${contexto.equipamento.unidade?.nomeSistema || 'N/A'}.`,
  ];

  if (manutencao.agendamentoDataInicioLocal && manutencao.agendamentoHoraInicioLocal) {
    partes.push(
      `Inicio previsto em ${manutencao.agendamentoDataInicioLocal} ${manutencao.agendamentoHoraInicioLocal}.`
    );
  }

  if (manutencao.agendamentoDataFimLocal && manutencao.agendamentoHoraFimLocal) {
    partes.push(
      `Fim previsto em ${manutencao.agendamentoDataFimLocal} ${manutencao.agendamentoHoraFimLocal}.`
    );
  }

  if (observacao) {
    partes.push(observacao);
  }

  return partes.join(' ');
}

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
    startDateLocal: dados.agendamentoDataInicioLocal,
    startTimeLocal: dados.agendamentoHoraInicioLocal,
    endDateLocal: dados.agendamentoDataFimLocal,
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

  await registrarEventoManutencao({
    tenantId,
    manutencaoId: nova.id,
    autorId: usuarioId,
    tipo: 'STATUS_BASE_EQUIPAMENTO',
    descricao: `Status base do equipamento registrado para a OS ${numeroOS}.`,
    metadata: {
      statusAnterior: contexto.equipamento.status,
      origem: 'criacao_os',
    },
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'Manutenção',
    entidadeId: nova.id,
    detalhes: `OS ${numeroOS} criada.`,
  });

  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: nova.equipamentoId,
    tipoEvento: 'manutencao_registrada',
    categoria: 'manutencao',
    subcategoria: nova.tipo,
    titulo: `OS ${numeroOS} registrada`,
    descricao: descricaoHistoricoManutencao({
      manutencao: nova,
      contexto,
    }),
    origem: 'usuario',
    status: nova.status,
    impactaAnalise: nova.tipo === 'Corretiva',
    referenciaId: nova.id,
    referenciaTipo: 'manutencao',
    metadata: {
      numeroOS,
      tipo: nova.tipo,
      status: nova.status,
      numeroChamado: nova.numeroChamado || null,
    },
    dataEvento: nova.dataHoraAgendamentoInicio || nova.createdAt,
  });

  await reprocessarAlertasManutencaoSemBloquear(tenantId);

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
    startDateLocal: dados.agendamentoDataInicioLocal,
    startTimeLocal: dados.agendamentoHoraInicioLocal,
    endDateLocal: dados.agendamentoDataFimLocal,
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

  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: atualizada.equipamentoId,
    tipoEvento: 'manutencao_atualizada',
    categoria: 'manutencao',
    subcategoria: atualizada.tipo,
    titulo: `OS ${atualizada.numeroOS} atualizada`,
    descricao: descricaoHistoricoManutencao({
      manutencao: atualizada,
      contexto,
      observacao: 'Cronograma ou dados operacionais da OS foram revisados.',
    }),
    origem: 'usuario',
    status: atualizada.status,
    impactaAnalise: false,
    referenciaId: atualizada.id,
    referenciaTipo: 'manutencao',
    metadata: {
      numeroOS: atualizada.numeroOS,
      tipo: atualizada.tipo,
      status: atualizada.status,
      numeroChamado: atualizada.numeroChamado || null,
    },
    dataEvento: new Date(),
  });

  await reprocessarAlertasManutencaoSemBloquear(tenantId);

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
  manutencaoRealizada,
  equipamentoOperante,
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
    manutencaoRealizada,
    equipamentoOperante,
    statusEquipamentoAnterior:
      (await buscarStatusAnteriorEquipamento({
        tenantId,
        manutencaoId,
      })) ||
      (manutencaoAtual.status === 'Agendada'
        ? manutencaoAtual.equipamento?.status || null
        : null),
  });

  if (!workflow.ok) {
    return workflow;
  }

  await prisma.$transaction(async (tx) => {
    await tx.manutencao.update({
      where: {
        tenantId_id: {
          tenantId,
          id: manutencaoId,
        },
      },
      data: workflow.updateData,
    });

    if (workflow.equipamentoStatus) {
      await tx.equipamento.update({
        where: {
          tenantId_id: {
            tenantId,
            id: manutencaoAtual.equipamentoId,
          },
        },
        data: {
          status: workflow.equipamentoStatus,
        },
      });
    }

    if (workflow.notaOperacional) {
      await tx.notaAndamento.create({
        data: {
          tenant: {
            connect: { id: tenantId },
          },
          nota: workflow.notaOperacional,
          autor: {
            connect: {
              tenantId_id: {
                tenantId,
                id: usuarioId,
              },
            },
          },
          manutencao: {
            connect: {
              tenantId_id: {
                tenantId,
                id: manutencaoId,
              },
            },
          },
        },
      });
    }

    await registrarEventoHistoricoAtivo({
      db: tx,
      tenantId,
      equipamentoId: manutencaoAtual.equipamentoId,
      tipoEvento: `manutencao_${acao}`,
      categoria: 'manutencao',
      subcategoria: manutencaoAtual.tipo,
      titulo: workflow.historicoTitulo || `OS ${manutencaoAtual.numeroOS} atualizada`,
      descricao: workflow.historicoDescricao || null,
      origem: 'usuario',
      status: workflow.updateData.status || manutencaoAtual.status,
      impactaAnalise: false,
      referenciaId: manutencaoId,
      referenciaTipo: 'manutencao',
      metadata: {
        numeroOS: manutencaoAtual.numeroOS,
        acao,
        tipo: manutencaoAtual.tipo,
        manutencaoRealizada,
        equipamentoOperante,
      },
      dataEvento:
        workflow.updateData.dataConclusao ||
        workflow.updateData.dataHoraAgendamentoFim ||
        new Date(),
    });

  });

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

  await reprocessarAlertasManutencaoSemBloquear(tenantId);

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
