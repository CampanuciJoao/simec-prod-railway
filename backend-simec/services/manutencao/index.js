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
import { registrarEventoHistoricoAtivo } from '../historicoAtivoService.js';
import { enfileirarReprocessamentoAlertasDoTenant } from '../queueService.js';
import { removerAlertasManutencaoDaOS } from '../alertas/manutencao/manutencaoAlertRepository.js';
import { validarManutencaoPayload } from '../../validators/manutencaoValidator.js';

async function reprocessarAlertasManutencaoSemBloquear(tenantId) {
  try {
    void enfileirarReprocessamentoAlertasDoTenant(tenantId, 'manutencao_atualizada').catch(
      (error) => {
        console.error(
          `[MANUTENCAO_ALERTAS_REPROCESS_ERROR] tenantId=${tenantId}`,
          error
        );
      }
    );
  } catch (error) {
    console.error(
      `[MANUTENCAO_ALERTAS_REPROCESS_ERROR] tenantId=${tenantId}`,
      error
    );
  }
}

async function limparAlertasOperacionaisDaOS({
  tenantId,
  numeroOS,
}) {
  try {
    await removerAlertasManutencaoDaOS(tenantId, numeroOS);
  } catch (error) {
    console.error(
      `[MANUTENCAO_ALERTAS_CLEANUP_ERROR] tenantId=${tenantId} numeroOS=${numeroOS}`,
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

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export async function listarManutencoesService({
  tenantId,
  filters,
}) {
  const page = parsePositiveInt(filters?.page, 1);
  const pageSize = Math.min(parsePositiveInt(filters?.pageSize, 20), 100);

  const manutencoes = await listarManutencoes({
    tenantId,
    equipamentoId: filters?.equipamentoId,
    unidadeId: filters?.unidadeId,
    tipo: filters?.tipo,
    status: filters?.status,
    search: filters?.search?.trim() || null,
    page,
    pageSize,
    sortBy: filters?.sortBy || 'dataHoraAgendamentoInicio',
    sortDirection: filters?.sortDirection === 'asc' ? 'asc' : 'desc',
    incluirNotas: !!filters?.equipamentoId,
  });

  return {
    items: adaptarListaManutencoesResponse(manutencoes.items || []),
    total: manutencoes.total || 0,
    page: manutencoes.page || page,
    pageSize: manutencoes.pageSize || pageSize,
    hasNextPage: Boolean(manutencoes.hasNextPage),
    metricas: manutencoes.metricas || {
      total: 0,
      emAndamento: 0,
      aguardando: 0,
      concluidas: 0,
      canceladas: 0,
    },
  };
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
  statusEquipamento = null,
}) {
  const validacaoPayload = validarManutencaoPayload(dados);

  if (!validacaoPayload.ok) {
    return {
      ok: false,
      status: 400,
      message: validacaoPayload.message,
      fieldErrors: validacaoPayload.fieldErrors,
      missingFields: validacaoPayload.missingFields,
    };
  }

  const dadosValidados = validacaoPayload.data;
  const contexto = await buscarContextoOperacional({
    tenantId,
    equipamentoId: dadosValidados.equipamentoId,
  });

  if (!contexto.ok) {
    return contexto;
  }

  const agendamento = validarAgendamento({
    startDateLocal: dadosValidados.agendamentoDataInicioLocal,
    startTimeLocal: dadosValidados.agendamentoHoraInicioLocal,
    endDateLocal: dadosValidados.agendamentoDataFimLocal,
    endTimeLocal: dadosValidados.agendamentoHoraFimLocal || null,
    timezone: contexto.timezone,
  });

  if (!agendamento.valid) {
    return {
      ok: false,
      status: 400,
      message: montarMensagemErroAgendamento(agendamento.code),
    };
  }

  if (!agendamento.semAgendamento) {
    const conflito = await existeConflitoAgendamento({
      tenantId,
      equipamentoId: dadosValidados.equipamentoId,
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
  }

  const totalTenant = await contarManutencoesDoTenant(tenantId);

  const numeroOS = gerarNumeroOS({
    tipo: dadosValidados.tipo,
    tag: contexto.equipamento.tag,
    sequencia: totalTenant + 1,
  });

  // Corretiva sem agendamento nasce como Pendente (triagem)
  const statusInicial = agendamento.semAgendamento && dadosValidados.tipo === 'Corretiva'
    ? 'Pendente'
    : (dadosValidados.status || 'Agendada');

  const payload = montarPayloadPersistencia({
    dados: { ...dadosValidados, status: statusInicial },
    agendamento,
    tenantId,
    equipamentoId: dadosValidados.equipamentoId,
    numeroOS,
  });

  const nova = await criarManutencao(payload);

  // Atualiza status do equipamento se informado na abertura da OS
  const statusEquipamentoAnterior = contexto.equipamento.status;
  const STATUS_VALIDOS = ['Operante', 'Inoperante', 'UsoLimitado', 'EmManutencao'];
  if (statusEquipamento && STATUS_VALIDOS.includes(statusEquipamento) && statusEquipamento !== statusEquipamentoAnterior) {
    await prisma.equipamento.update({
      where: { tenantId_id: { tenantId, id: nova.equipamentoId } },
      data: { status: statusEquipamento },
    });
  }

  await registrarEventoManutencao({
    tenantId,
    manutencaoId: nova.id,
    autorId: usuarioId,
    tipo: 'STATUS_BASE_EQUIPAMENTO',
    descricao: `Status base do equipamento registrado para a OS ${numeroOS}.`,
    metadata: {
      statusAnterior: statusEquipamentoAnterior,
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

  await limparAlertasOperacionaisDaOS({
    tenantId,
    numeroOS: nova.numeroOS,
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
  const validacaoPayload = validarManutencaoPayload(dados);

  if (!validacaoPayload.ok) {
    return {
      ok: false,
      status: 400,
      message: validacaoPayload.message,
      fieldErrors: validacaoPayload.fieldErrors,
      missingFields: validacaoPayload.missingFields,
    };
  }

  const dadosValidados = validacaoPayload.data;
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
    equipamentoId: dadosValidados.equipamentoId,
  });

  if (!contexto.ok) {
    return contexto;
  }

  const agendamento = validarAgendamento({
    startDateLocal: dadosValidados.agendamentoDataInicioLocal,
    startTimeLocal: dadosValidados.agendamentoHoraInicioLocal,
    endDateLocal: dadosValidados.agendamentoDataFimLocal,
    endTimeLocal: dadosValidados.agendamentoHoraFimLocal || null,
    timezone: contexto.timezone,
  });

  if (!agendamento.valid) {
    return {
      ok: false,
      status: 400,
      message: montarMensagemErroAgendamento(agendamento.code),
    };
  }

  if (!agendamento.semAgendamento) {
    const conflito = await existeConflitoAgendamento({
      tenantId,
      equipamentoId: dadosValidados.equipamentoId,
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
  }

  const payload = montarPayloadPersistencia({
    dados: dadosValidados,
    agendamento,
    tenantId,
    equipamentoId: dadosValidados.equipamentoId,
    numeroOSExistente: manutencaoAtual.numeroOS,
  });

  const atualizada = await atualizarManutencao({
    tenantId,
    manutencaoId,
    payload,
  });

  const alteracoes = [];
  if (dadosValidados.tecnicoResponsavel !== manutencaoAtual.tecnicoResponsavel) {
    const anterior = manutencaoAtual.tecnicoResponsavel || 'não definido';
    const novo = dadosValidados.tecnicoResponsavel || 'não definido';
    alteracoes.push(`Técnico: "${anterior}" → "${novo}"`);
  }
  if (dadosValidados.agendamentoDataInicioLocal !== manutencaoAtual.agendamentoDataInicioLocal) {
    alteracoes.push(`Início: ${manutencaoAtual.agendamentoDataInicioLocal || '—'} → ${dadosValidados.agendamentoDataInicioLocal}`);
  }
  if (dadosValidados.agendamentoDataFimLocal !== manutencaoAtual.agendamentoDataFimLocal) {
    alteracoes.push(`Fim: ${manutencaoAtual.agendamentoDataFimLocal || '—'} → ${dadosValidados.agendamentoDataFimLocal}`);
  }

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'Manutenção',
    entidadeId: atualizada.id,
    detalhes: alteracoes.length > 0
      ? `OS ${atualizada.numeroOS} atualizada. ${alteracoes.join('. ')}.`
      : `OS ${atualizada.numeroOS} atualizada.`,
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
  // campos para agendar_visita
  agendamentoDataInicioLocal,
  agendamentoHoraInicioLocal,
  agendamentoDataFimLocal,
  agendamentoHoraFimLocal,
  numeroChamado,
  tecnicoResponsavel,
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

  // Para agendar_visita, validar e converter datas antes de montar workflow
  let agendamentoStartUtc = null;
  let agendamentoEndUtc = null;

  if (acao === 'agendar_visita') {
    const { validarAgendarVisitaPayload } = await import('../../validators/manutencaoValidator.js');
    const validacaoAgendamento = validarAgendarVisitaPayload({
      agendamentoDataInicioLocal,
      agendamentoHoraInicioLocal,
      agendamentoDataFimLocal,
      agendamentoHoraFimLocal,
      numeroChamado,
      tecnicoResponsavel,
      observacao,
    });

    if (!validacaoAgendamento.ok) {
      return {
        ok: false,
        status: 400,
        message: validacaoAgendamento.message,
        fieldErrors: validacaoAgendamento.fieldErrors,
      };
    }

    const agendamento = validarAgendamento({
      startDateLocal: agendamentoDataInicioLocal,
      startTimeLocal: agendamentoHoraInicioLocal,
      endDateLocal: agendamentoDataFimLocal,
      endTimeLocal: agendamentoHoraFimLocal,
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
      equipamentoId: manutencaoAtual.equipamentoId,
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

    agendamentoStartUtc = agendamento.startUtc;
    agendamentoEndUtc = agendamento.endUtc;
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
    agendamentoDataInicioLocal,
    agendamentoHoraInicioLocal,
    agendamentoDataFimLocal,
    agendamentoHoraFimLocal,
    agendamentoStartUtc,
    agendamentoEndUtc,
    numeroChamado,
    tecnicoResponsavel,
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

  await limparAlertasOperacionaisDaOS({
    tenantId,
    numeroOS: manutencaoAtual.numeroOS,
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

  await limparAlertasOperacionaisDaOS({
    tenantId,
    numeroOS: manut.numeroOS,
  });

  return {
    ok: true,
    manut,
  };
}
