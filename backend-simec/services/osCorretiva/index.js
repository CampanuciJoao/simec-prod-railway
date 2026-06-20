import prisma from '../prismaService.js';
import { parsePositiveInt } from '../shared/textUtils.js';
import { registrarLog } from '../logService.js';
import { registrarEventoHistoricoAtivo } from '../historicoAtivoService.js';
import { enfileirarReprocessamentoAlertasDoTenant } from '../queueService.js';

import {
  buscarOsPorId,
  buscarOsResumo,
  listarOsCorretivas,
  contarOsDoTenant,
  atualizarOsCorretiva,
  criarNotaOsCorretiva,
  criarVisitaTerceiro,
  buscarVisitaPorId,
  atualizarVisita,
  buscarConflitoVisitaPorEquipamento,
} from './osCorretivaRepository.js';
import { removerAlertasOsCorretivaDaOS } from '../alertas/osCorretiva/osCorretivaAlertRepository.js';

import {
  validarAbrirOs,
  validarNota,
  validarEdicaoNota,
  validarEdicaoDescricao,
  validarAgendarVisita,
  validarReagendarVisita,
  validarRegistrarResultado,
  validarConcluirOs,
  validarMoverOsEquipamento,
} from '../../validators/osCorretivaValidator.js';

function gerarNumeroOs({ tag, sequencia }) {
  const seq = String(sequencia).padStart(4, '0');
  const tagClean = tag.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  return `OC-${tagClean}-${seq}`;
}


async function reprocessarAlertas(tenantId) {
  try {
    void enfileirarReprocessamentoAlertasDoTenant(tenantId, 'os_corretiva_atualizada').catch(() => {});
  } catch {}
}

/**
 * Ao encerrar uma OS (concluída/cancelada/excluída ou resolvida por visita)
 * só "libera" o equipamento para Operante se a OS realmente havia mudado o
 * status na abertura. Quando a abertura foi com `Operante` (problema
 * intermitente / observação), a OS nunca bloqueou o equipamento — não há o
 * que liberar, e forçar Operante atropelaria qualquer outra alteração de
 * status que possa ter ocorrido em paralelo (outra OS, atualização manual).
 */
async function liberarEquipamentoSeNecessario(tx, os) {
  if (!os || os.statusEquipamentoAbertura === 'Operante') return;
  await tx.equipamento.update({
    where: { id: os.equipamentoId },
    data: { status: 'Operante' },
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listarOsCorretivasService({ tenantId, filters }) {
  const page = parsePositiveInt(filters?.page, 1);
  const pageSize = Math.min(parsePositiveInt(filters?.pageSize, 20), 100);

  return listarOsCorretivas({
    tenantId,
    equipamentoId: filters?.equipamentoId || null,
    status: filters?.status || null,
    tipo: filters?.tipo || null,
    search: filters?.search?.trim() || null,
    page,
    pageSize,
  });
}

// ─── Get detail ──────────────────────────────────────────────────────────────

export async function obterOsCorretivaDetalhadaService({ tenantId, osId }) {
  const os = await buscarOsPorId({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };
  return { ok: true, data: os };
}

// ─── Abrir OS ─────────────────────────────────────────────────────────────────

export async function abrirOsCorretivaService({ tenantId, usuarioId, dados }) {
  const v = validarAbrirOs(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const equipamento = await prisma.equipamento.findFirst({
    where: { tenantId, id: v.data.equipamentoId },
    include: { unidade: { select: { nomeSistema: true } } },
  });

  if (!equipamento) {
    return { ok: false, status: 404, message: 'Equipamento não encontrado.' };
  }

  if (equipamento.status === 'Desativado' || equipamento.status === 'Vendido') {
    return {
      ok: false,
      status: 422,
      message: `Não é possível abrir OS para equipamento com status "${equipamento.status}".`,
    };
  }

  const total = await contarOsDoTenant(tenantId);
  const numeroOS = gerarNumeroOs({ tag: equipamento.tag, sequencia: total + 1 });

  const dataHoraInicioEvento = v.data.dataHoraInicioEvento
    ? new Date(v.data.dataHoraInicioEvento)
    : null;

  const novaOs = await prisma.$transaction(async (tx) => {
    const os = await tx.osCorretiva.create({
      data: {
        tenantId,
        numeroOS,
        equipamentoId: v.data.equipamentoId,
        solicitante: v.data.solicitante,
        descricaoProblema: v.data.descricaoProblema,
        statusEquipamentoAbertura: v.data.statusEquipamentoAbertura,
        status: 'Aberta',
        tipo: 'Ocorrencia',
        autorId: usuarioId,
        dataHoraInicioEvento,
      },
    });

    await tx.equipamento.update({
      where: { id: v.data.equipamentoId },
      data: { status: v.data.statusEquipamentoAbertura },
    });

    return os;
  });

  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: novaOs.equipamentoId,
    tipoEvento: 'os_corretiva_aberta',
    categoria: 'manutencao',
    subcategoria: 'Ocorrencia',
    titulo: `Ocorrência ${numeroOS} aberta`,
    descricao: `Problema relatado por ${v.data.solicitante}. Status do equipamento: ${v.data.statusEquipamentoAbertura}.`,
    origem: 'usuario',
    status: 'Aberta',
    impactaAnalise: true,
    referenciaId: novaOs.id,
    referenciaTipo: 'os_corretiva',
    metadata: {
      numeroOS,
      solicitante: v.data.solicitante,
      statusEquipamentoAbertura: v.data.statusEquipamentoAbertura,
      ...(dataHoraInicioEvento ? { dataHoraInicioEvento: dataHoraInicioEvento.toISOString() } : {}),
    },
    dataEvento: dataHoraInicioEvento || novaOs.dataHoraAbertura,
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'OsCorretiva',
    entidadeId: novaOs.id,
    detalhes: `OS Corretiva ${numeroOS} aberta. Solicitante: ${v.data.solicitante}.`,
  });

  await reprocessarAlertas(tenantId);

  const completa = await buscarOsPorId({ tenantId, osId: novaOs.id });
  return { ok: true, status: 201, data: completa };
}

// ─── Adicionar nota ───────────────────────────────────────────────────────────

export async function adicionarNotaOsCorretivaService({ tenantId, usuarioId, osId, dados }) {
  const v = validarNota(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };
  if (os.status === 'Concluida') {
    return { ok: false, status: 422, message: 'Não é possível adicionar notas a uma OS já concluída.' };
  }

  const usuario = await prisma.usuario.findFirst({
    where: { tenantId, id: usuarioId },
    select: { nome: true },
  });

  const tecnicoNome = v.data.tecnicoNome || usuario?.nome || 'Técnico';

  const nota = await criarNotaOsCorretiva({
    tenantId,
    osId,
    nota: v.data.nota,
    autorId: usuarioId,
    tecnicoNome,
  });

  // Avança status para EmAndamento se ainda estava Aberta
  if (os.status === 'Aberta') {
    await atualizarOsCorretiva({ tenantId, osId, data: { status: 'EmAndamento' } });
  }

  // Atualizacao opcional do status do equipamento junto com a nota.
  // Caso de uso: durante testes pos-reparo, marcar como UsoLimitado
  // ('operante em observacao') antes de concluir. Registra evento
  // historico com a transicao pra auditoria.
  let statusEquipAntes = null;
  let statusEquipDepois = null;
  if (v.data.novoStatusEquipamento) {
    const equipAtual = await prisma.equipamento.findFirst({
      where: { tenantId, id: os.equipamentoId },
      select: { status: true },
    });
    statusEquipAntes = equipAtual?.status || null;
    statusEquipDepois = v.data.novoStatusEquipamento;

    if (statusEquipAntes !== statusEquipDepois) {
      await prisma.equipamento.update({
        where: { id: os.equipamentoId },
        data: { status: statusEquipDepois },
      });

      await registrarEventoHistoricoAtivo({
        tenantId,
        equipamentoId: os.equipamentoId,
        tipoEvento: 'equipamento_status_atualizado',
        categoria: 'manutencao',
        subcategoria: os.tipo,
        titulo: `Status do equipamento: ${statusEquipAntes} → ${statusEquipDepois}`,
        descricao: `Atualizado durante a OS ${os.numeroOS}. Nota: ${v.data.nota.slice(0, 240)}`,
        origem: 'usuario',
        status: os.status,
        impactaAnalise: true,
        referenciaId: osId,
        referenciaTipo: 'os_corretiva',
        metadata: {
          numeroOS: os.numeroOS,
          statusAnterior: statusEquipAntes,
          statusNovo: statusEquipDepois,
          notaId: nota.id,
        },
        dataEvento: new Date(),
      });
    }
  }

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'NotaAndamento',
    entidadeId: nota.id,
    detalhes:
      statusEquipDepois && statusEquipAntes !== statusEquipDepois
        ? `Nota adicionada à OS ${os.numeroOS}. Status do equipamento: ${statusEquipAntes} → ${statusEquipDepois}.`
        : `Nota adicionada à OS ${os.numeroOS}.`,
  });

  return {
    ok: true,
    status: 201,
    data: {
      nota,
      ...(statusEquipDepois && statusEquipAntes !== statusEquipDepois
        ? { statusEquipamentoAtualizado: { de: statusEquipAntes, para: statusEquipDepois } }
        : {}),
    },
  };
}

// ─── Edição admin de nota ────────────────────────────────────────────────────
// Permite ajustar texto e/ou data de uma nota já registrada. Restrito a
// admin (controle na rota). Usado para corrigir registros retroativos
// onde a hora salva pelo sistema fica fora de ordem cronológica com os
// outros eventos da OS.
export async function editarNotaOsCorretivaService({
  tenantId,
  usuarioId,
  osId,
  notaId,
  dados,
}) {
  const v = validarEdicaoNota(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };

  // Nota precisa pertencer à OS e ao tenant — defesa contra IDs cruzados.
  const nota = await prisma.notaAndamento.findFirst({
    where: { id: notaId, tenantId, osCorretivaId: osId },
  });
  if (!nota) {
    return { ok: false, status: 404, message: 'Nota de andamento não encontrada.' };
  }

  const update = {};
  const antes = {};
  const depois = {};
  if (v.data.nota !== undefined && v.data.nota !== nota.nota) {
    update.nota = v.data.nota;
    antes.nota = nota.nota;
    depois.nota = v.data.nota;
  }
  if (v.data.data !== undefined) {
    const novaData = new Date(v.data.data);
    if (novaData.getTime() !== nota.data.getTime()) {
      update.data = novaData;
      antes.data = nota.data.toISOString();
      depois.data = novaData.toISOString();
    }
  }

  if (Object.keys(update).length === 0) {
    return { ok: true, status: 200, data: nota };
  }

  update.editadoEm = new Date();
  update.editadoPorId = usuarioId;

  const atualizada = await prisma.notaAndamento.update({
    where: { id: notaId },
    data: update,
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDICAO',
    entidade: 'NotaAndamento',
    entidadeId: notaId,
    detalhes: `Nota da OS ${os.numeroOS} editada. ${JSON.stringify({ antes, depois })}`,
  });

  return { ok: true, status: 200, data: atualizada };
}

// ─── Editar descrição original da OS ─────────────────────────────────────────
// Correção de typo / ajuste no descritivo. Motivo é obrigatório e o
// antes/depois fica em LogAuditoria pra rastreabilidade — auditoria
// futura precisa saber o que mudou e por quê. A edição é permitida
// inclusive em OS concluída/cancelada (correção retroativa é o caso
// principal — typo descoberto depois).
export async function editarDescricaoOsCorretivaService({
  tenantId,
  usuarioId,
  osId,
  dados,
}) {
  const v = validarEdicaoDescricao(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const osCompleta = await buscarOsPorId({ tenantId, osId });
  if (!osCompleta) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };

  const descricaoAntes = osCompleta.descricaoProblema || '';
  const descricaoDepois = v.data.descricaoProblema;

  if (descricaoAntes === descricaoDepois) {
    return { ok: true, status: 200, data: osCompleta };
  }

  await atualizarOsCorretiva({
    tenantId,
    osId,
    data: { descricaoProblema: descricaoDepois },
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDICAO',
    entidade: 'OsCorretiva',
    entidadeId: osId,
    detalhes: `Descrição da OS ${osCompleta.numeroOS} editada. ${JSON.stringify({
      motivo: v.data.motivo,
      antes: descricaoAntes,
      depois: descricaoDepois,
    })}`,
  });

  const atualizada = await buscarOsPorId({ tenantId, osId });
  return { ok: true, status: 200, data: atualizada };
}

// ─── Agendar visita de terceiro ───────────────────────────────────────────────

export async function agendarVisitaTerceiroService({ tenantId, usuarioId, osId, dados }) {
  const v = validarAgendarVisita(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };
  if (os.status === 'Concluida') {
    return { ok: false, status: 422, message: 'Não é possível agendar visita em OS concluída.' };
  }

  const inicioUtc = new Date(v.data.dataHoraInicioPrevista);
  const fimUtc = new Date(v.data.dataHoraFimPrevista);

  const conflito = await buscarConflitoVisitaPorEquipamento({
    tenantId,
    equipamentoId: os.equipamentoId,
    inicioUtc,
    fimUtc,
  });

  if (conflito) {
    const inicio = conflito.dataHoraInicioPrevista.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const fim = conflito.dataHoraFimPrevista.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data = conflito.dataHoraInicioPrevista.toLocaleDateString('pt-BR');
    return {
      ok: false,
      status: 409,
      message: `Já existe uma visita agendada para este equipamento nesse horário (${conflito.osCorretiva.numeroOS} — ${conflito.prestadorNome}, ${data} das ${inicio} às ${fim}). Por favor, escolha outro horário.`,
      conflito: {
        visitaId: conflito.id,
        numeroOS: conflito.osCorretiva.numeroOS,
        prestadorNome: conflito.prestadorNome,
        dataHoraInicioPrevista: conflito.dataHoraInicioPrevista,
        dataHoraFimPrevista: conflito.dataHoraFimPrevista,
      },
    };
  }

  const visita = await criarVisitaTerceiro({
    tenantId,
    osId,
    prestadorNome: v.data.prestadorNome,
    dataHoraInicioPrevista: v.data.dataHoraInicioPrevista,
    dataHoraFimPrevista: v.data.dataHoraFimPrevista,
  });

  const foiPromovida = os.tipo === 'Ocorrencia';
  await atualizarOsCorretiva({
    tenantId,
    osId,
    data: {
      status: 'AguardandoTerceiro',
      ...(foiPromovida ? { tipo: 'Corretiva' } : {}),
    },
  });

  if (foiPromovida) {
    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: os.equipamentoId,
      tipoEvento: 'os_corretiva_promovida',
      categoria: 'manutencao',
      subcategoria: 'Corretiva',
      titulo: `Ocorrência ${os.numeroOS} promovida a OS Corretiva`,
      descricao: `Visita de terceiro agendada com ${v.data.prestadorNome}. A ocorrência passa a ser tratada como OS Corretiva.`,
      origem: 'usuario',
      status: 'AguardandoTerceiro',
      impactaAnalise: true,
      referenciaId: osId,
      referenciaTipo: 'os_corretiva',
      metadata: { prestadorNome: v.data.prestadorNome },
      dataEvento: new Date(),
    });
  }

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'VisitaTerceiro',
    entidadeId: visita.id,
    detalhes: `Visita agendada para OS ${os.numeroOS}. Prestador: ${v.data.prestadorNome}.${foiPromovida ? ' Promovida a Corretiva.' : ''}`,
  });

  const osAtualizada = await buscarOsPorId({ tenantId, osId });
  return { ok: true, status: 201, data: osAtualizada };
}

// ─── Confirmar chegada do técnico (Agendada → EmExecucao) ────────────────────

export async function iniciarVisitaTerceiroService({ tenantId, usuarioId, osId, visitaId }) {
  const visita = await buscarVisitaPorId({ tenantId, visitaId });
  if (!visita) return { ok: false, status: 404, message: 'Visita não encontrada.' };
  if (visita.osCorretiva.id !== osId) {
    return { ok: false, status: 422, message: 'Visita não pertence a esta OS.' };
  }
  if (visita.status !== 'Agendada') {
    return { ok: false, status: 422, message: 'Só é possível confirmar chegada em visitas com status Agendada.' };
  }

  await atualizarVisita({
    tenantId,
    visitaId,
    data: { status: 'EmExecucao', dataHoraInicioReal: new Date() },
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'VisitaTerceiro',
    entidadeId: visitaId,
    detalhes: `Chegada do técnico confirmada na visita da OS ${visita.osCorretiva.id}. Status: EmExecucao.`,
  });

  const osAtualizada = await buscarOsPorId({ tenantId, osId });
  return { ok: true, data: osAtualizada };
}

// ─── Reagendar visita Agendada (sem cancelar a OS) ────────────────────────────
//
// Caso de uso: a empresa avisou imprevisto na data combinada, ou o cliente
// precisa trocar de prestador. Em vez de cancelar a OS inteira (perdendo
// historico e numero), o admin reagenda a visita.
//
// Padrao: cria NOVA VisitaTerceiro e marca a antiga como 'Reagendada' —
// preserva auditoria completa. Espelha o que ja acontece em 'PrazoEstendido'
// (resultado=PrazoEstendido em registrarResultadoVisitaService).
//
// Pre-condicoes:
// - visita existe, pertence a OS e ao tenant
// - visita.status === 'Agendada' (nao reagenda EmExecucao ou Concluida)
// - sem conflito de horario com outras visitas do mesmo equipamento
//
// Motivo eh obrigatorio — vai no log de auditoria e fica visivel na timeline.

export async function reagendarVisitaTerceiroService({ tenantId, usuarioId, osId, visitaId, dados }) {
  const v = validarReagendarVisita(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const visita = await buscarVisitaPorId({ tenantId, visitaId });
  if (!visita) return { ok: false, status: 404, message: 'Visita não encontrada.' };
  if (visita.osCorretiva.id !== osId) {
    return { ok: false, status: 422, message: 'Visita não pertence a esta OS.' };
  }
  if (visita.status !== 'Agendada') {
    return {
      ok: false,
      status: 422,
      message: 'Só é possível reagendar visitas com status Agendada. Para visitas em execução, registre o resultado e use Prazo Estendido se precisar.',
    };
  }

  const inicioUtc = new Date(v.data.dataHoraInicioPrevista);
  const fimUtc    = new Date(v.data.dataHoraFimPrevista);

  // Conflito ignora a propria visita (ela vai ser marcada como Reagendada)
  const conflito = await buscarConflitoVisitaPorEquipamento({
    tenantId,
    equipamentoId: visita.osCorretiva.equipamentoId,
    inicioUtc,
    fimUtc,
    ignorarVisitaId: visitaId,
  });
  if (conflito) {
    const inicio = conflito.dataHoraInicioPrevista.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const fim    = conflito.dataHoraFimPrevista.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data   = conflito.dataHoraInicioPrevista.toLocaleDateString('pt-BR');
    return {
      ok: false,
      status: 409,
      message: `Já existe uma visita agendada para este equipamento nesse horário (${conflito.osCorretiva.numeroOS} — ${conflito.prestadorNome}, ${data} das ${inicio} às ${fim}). Escolha outro horário.`,
      conflito: {
        visitaId: conflito.id,
        numeroOS: conflito.osCorretiva.numeroOS,
        prestadorNome: conflito.prestadorNome,
        dataHoraInicioPrevista: conflito.dataHoraInicioPrevista,
        dataHoraFimPrevista: conflito.dataHoraFimPrevista,
      },
    };
  }

  // Prestador eh opcional — null/undefined = mantem o atual
  const prestadorAntigo = visita.prestadorNome;
  const prestadorNovo   = v.data.prestadorNome?.trim() || prestadorAntigo;
  const datasAntigas    = {
    inicio: visita.dataHoraInicioPrevista,
    fim:    visita.dataHoraFimPrevista,
  };

  // Transacao: marca antiga + cria nova. Get-or-fail no commit pra
  // evitar estado parcial.
  const novaVisita = await prisma.$transaction(async (tx) => {
    await tx.visitaTerceiro.update({
      where: { tenantId_id: { tenantId, id: visitaId } },
      data:  { status: 'Reagendada' },
    });

    return tx.visitaTerceiro.create({
      data: {
        tenant: { connect: { id: tenantId } },
        osCorretiva: { connect: { tenantId_id: { tenantId, id: osId } } },
        prestadorNome: prestadorNovo,
        dataHoraInicioPrevista: inicioUtc,
        dataHoraFimPrevista:    fimUtc,
        status: 'Agendada',
      },
    });
  });

  // Evento no historico do equipamento (rastreio cross-OS)
  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: visita.osCorretiva.equipamentoId,
    tipoEvento: 'os_corretiva_visita_reagendada',
    categoria: 'manutencao',
    subcategoria: 'reagendamento',
    titulo: `Visita reagendada — OS ${visita.osCorretiva.numeroOS}`,
    descricao: `Motivo: ${v.data.motivo}. De ${datasAntigas.inicio.toISOString()} (${prestadorAntigo}) para ${inicioUtc.toISOString()} (${prestadorNovo}).`,
    origem: 'usuario',
    status: 'AguardandoTerceiro',
    impactaAnalise: false,
    referenciaId: osId,
    referenciaTipo: 'os_corretiva',
    metadata: {
      visitaAntigaId: visitaId,
      visitaNovaId:   novaVisita.id,
      prestadorAntigo,
      prestadorNovo,
      datasAntigas:   { inicio: datasAntigas.inicio, fim: datasAntigas.fim },
      datasNovas:     { inicio: inicioUtc, fim: fimUtc },
      motivo: v.data.motivo,
    },
    dataEvento: new Date(),
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'VisitaTerceiro',
    entidadeId: visitaId,
    detalhes: `Visita da OS ${visita.osCorretiva.numeroOS} reagendada. ${
      prestadorAntigo !== prestadorNovo
        ? `Prestador: ${prestadorAntigo} → ${prestadorNovo}. `
        : ''
    }Datas: ${datasAntigas.inicio.toISOString()} → ${inicioUtc.toISOString()}. Motivo: ${v.data.motivo}`,
  });

  const osAtualizada = await buscarOsPorId({ tenantId, osId });
  return { ok: true, data: osAtualizada };
}

// ─── Registrar resultado de visita ───────────────────────────────────────────

export async function registrarResultadoVisitaService({ tenantId, usuarioId, osId, visitaId, dados }) {
  const v = validarRegistrarResultado(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const visita = await buscarVisitaPorId({ tenantId, visitaId });
  if (!visita) return { ok: false, status: 404, message: 'Visita não encontrada.' };
  if (visita.osCorretiva.id !== osId) {
    return { ok: false, status: 422, message: 'Visita não pertence a esta OS.' };
  }
  if (
    visita.status === 'Concluida' ||
    visita.status === 'PrazoEstendido' ||
    visita.status === 'NaoRealizada' ||
    visita.status === 'ProblemaPersiste'
  ) {
    return { ok: false, status: 422, message: 'Esta visita já teve resultado registrado.' };
  }

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS não encontrada.' };

  if (v.data.resultado === 'Operante') {
    const dataFimReal = v.data.dataHoraFimReal ? new Date(v.data.dataHoraFimReal) : new Date();

    // Encerra a visita e a OS
    await prisma.$transaction(async (tx) => {
      await tx.visitaTerceiro.update({
        where: { tenantId_id: { tenantId, id: visitaId } },
        data: {
          status: 'Concluida',
          resultado: 'Operante',
          observacoes: v.data.observacoes || null,
          dataHoraFimReal: dataFimReal,
        },
      });

      await tx.osCorretiva.update({
        where: { tenantId_id: { tenantId, id: osId } },
        data: {
          status: 'Concluida',
          dataHoraConclusao: dataFimReal,
          observacoesFinais: v.data.observacoes || null,
          concluidoPorId: usuarioId,
        },
      });

      await liberarEquipamentoSeNecessario(tx, os);
    });

    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: os.equipamentoId,
      tipoEvento: 'os_corretiva_concluida',
      categoria: 'manutencao',
      subcategoria: os.tipo,
      titulo: `OS ${os.numeroOS} concluída — Equipamento Operante`,
      descricao: v.data.observacoes || 'Manutenção corretiva concluída.',
      origem: 'usuario',
      status: 'Concluida',
      impactaAnalise: true,
      referenciaId: osId,
      referenciaTipo: 'os_corretiva',
      metadata: { resultado: 'Operante' },
      dataEvento: new Date(),
    });

  } else if (v.data.resultado === 'PrazoEstendido' || v.data.resultado === 'NaoRealizada') {
    // PrazoEstendido — manutencao em andamento, equipamento continua
    //                  inoperante, precisa de mais tempo
    // NaoRealizada   — visita nao aconteceu (no-show), reagenda sem
    //                  trocar status do equipamento
    //
    // Ambos marcam a visita atual com status correspondente.
    //
    // Quanto a nova visita:
    //   - COM datas: cria visita nova (mesmo prestador) + OS continua
    //     em AguardandoTerceiro
    //   - SEM datas: nao cria visita + OS volta pra EmAndamento (admin
    //     agenda depois pelo fluxo 'Agendar visita')
    //
    // NUNCA toca no equipamento aqui — quem libera eh o resultado Operante.
    const novoStatus = v.data.resultado;
    const obsFinal =
      v.data.resultado === 'NaoRealizada'
        ? v.data.motivoNaoRealizacao
        : v.data.observacoes || null;
    const temDatas = !!(v.data.novaDataHoraInicioPrevista && v.data.novaDataHoraFimPrevista);

    await atualizarVisita({
      tenantId,
      visitaId,
      data: {
        status: novoStatus,
        resultado: novoStatus,
        observacoes: obsFinal,
        dataHoraFimReal: new Date(),
      },
    });

    if (temDatas) {
      await criarVisitaTerceiro({
        tenantId,
        osId,
        prestadorNome: visita.prestadorNome,
        dataHoraInicioPrevista: v.data.novaDataHoraInicioPrevista,
        dataHoraFimPrevista: v.data.novaDataHoraFimPrevista,
      });
    } else {
      // Sem nova visita marcada — OS volta pra EmAndamento (aberta,
      // sem terceiro pendente). Admin pode agendar quando tiver data.
      await prisma.osCorretiva.update({
        where: { tenantId_id: { tenantId, id: osId } },
        data: { status: 'EmAndamento' },
      });
    }
  } else if (v.data.resultado === 'ProblemaPersiste') {
    // ProblemaPersiste — visita executada, manutencao tentada, problema
    // continua. Equipamento parcial (UsoLimitado) ou parado (Inoperante).
    // SEM nova visita ainda — OS volta pra EmAndamento ate o admin
    // agendar nova visita via fluxo padrao "Agendar visita".
    const novoStatusEq = v.data.novoStatusEquipamento;
    const obsFinal = v.data.observacoes || null;

    await prisma.$transaction(async (tx) => {
      await tx.visitaTerceiro.update({
        where: { tenantId_id: { tenantId, id: visitaId } },
        data: {
          status: 'ProblemaPersiste',
          resultado: 'ProblemaPersiste',
          observacoes: obsFinal,
          dataHoraFimReal: new Date(),
        },
      });

      // OS volta pra EmAndamento (visivel como aberta, sem terceiro
      // agendado). Quando admin marcar nova visita, volta pra
      // AguardandoTerceiro pelo fluxo existente.
      await tx.osCorretiva.update({
        where: { tenantId_id: { tenantId, id: osId } },
        data: { status: 'EmAndamento' },
      });

      // Atualiza status do equipamento conforme escolhido (UsoLimitado
      // ou Inoperante). Antes era so quem chega como Operante na
      // abertura voltava pra Operante no fim; aqui forcamos explicito.
      await tx.equipamento.update({
        where: { id: os.equipamentoId },
        data: { status: novoStatusEq },
      });
    });

    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: os.equipamentoId,
      tipoEvento: 'os_corretiva_problema_persiste',
      categoria: 'manutencao',
      subcategoria: os.tipo,
      titulo: `OS ${os.numeroOS} — visita executada, problema persiste`,
      descricao: obsFinal || 'Manutenção realizada mas problema persiste.',
      origem: 'usuario',
      status: 'EmAndamento',
      impactaAnalise: true,
      referenciaId: osId,
      referenciaTipo: 'os_corretiva',
      metadata: {
        resultado: 'ProblemaPersiste',
        novoStatusEquipamento: novoStatusEq,
        prestadorNome: visita.prestadorNome,
      },
      dataEvento: new Date(),
    });
  }

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'VisitaTerceiro',
    entidadeId: visitaId,
    detalhes: `Resultado da visita na OS ${os.numeroOS}: ${v.data.resultado}.`,
  });

  if (v.data.resultado === 'Operante') {
    await removerAlertasOsCorretivaDaOS(tenantId, os.numeroOS);
  }

  await reprocessarAlertas(tenantId);

  const osAtualizada = await buscarOsPorId({ tenantId, osId });
  return { ok: true, data: osAtualizada };
}

// ─── Concluir OS (sem visita de terceiro) ────────────────────────────────────

export async function concluirOsCorretivaService({ tenantId, usuarioId, osId, dados }) {
  const v = validarConcluirOs(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message };

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };
  if (os.status === 'Concluida') {
    return { ok: false, status: 422, message: 'OS já está concluída.' };
  }
  if (os.status === 'AguardandoTerceiro') {
    return {
      ok: false,
      status: 422,
      message: 'Para concluir uma OS com visita agendada, registre o resultado da visita.',
    };
  }

  // dataHoraConclusao = momento do click no sistema (sempre agora).
  // dataHoraFimEvento = hora real em que o problema foi resolvido (pode ser
  // anterior a agora — registro retroativo). Quando o admin nao informa,
  // assume-se que o problema foi resolvido agora.
  const dataHoraConclusao = new Date();
  const dataHoraFimEvento = v.data.dataHoraFimEvento
    ? new Date(v.data.dataHoraFimEvento)
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.osCorretiva.update({
      where: { tenantId_id: { tenantId, id: osId } },
      data: {
        status: 'Concluida',
        dataHoraConclusao,
        dataHoraFimEvento,
        observacoesFinais: v.data.observacoesFinais || null,
        concluidoPorId: usuarioId,
      },
    });

    await liberarEquipamentoSeNecessario(tx, os);
  });

  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: os.equipamentoId,
    tipoEvento: 'os_corretiva_concluida',
    categoria: 'manutencao',
    subcategoria: os.tipo,
    titulo: `OS ${os.numeroOS} concluída — Resolvida internamente`,
    descricao: v.data.observacoesFinais || 'Ocorrência encerrada internamente.',
    origem: 'usuario',
    status: 'Concluida',
    impactaAnalise: true,
    referenciaId: osId,
    referenciaTipo: 'os_corretiva',
    metadata: { resultado: 'Operante', origem: 'resolucao_interna' },
    dataEvento: dataHoraFimEvento || dataHoraConclusao,
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'OsCorretiva',
    entidadeId: osId,
    detalhes: `OS ${os.numeroOS} concluída.${os.statusEquipamentoAbertura !== 'Operante' ? ' Equipamento retornou a Operante.' : ''}`,
  });

  await removerAlertasOsCorretivaDaOS(tenantId, os.numeroOS);
  await reprocessarAlertas(tenantId);

  const completa = await buscarOsPorId({ tenantId, osId });
  return { ok: true, data: completa };
}

// ─── Cancelar OS ─────────────────────────────────────────────────────────────

export async function cancelarOsCorretivaService({ tenantId, usuarioId, osId, motivoCancelamento }) {
  if (!motivoCancelamento?.trim()) {
    return { ok: false, status: 400, message: 'O motivo do cancelamento é obrigatório.' };
  }

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };

  if (os.status === 'Concluida') {
    return { ok: false, status: 422, message: 'Não é possível cancelar uma OS já concluída.' };
  }
  if (os.status === 'Cancelada') {
    return { ok: false, status: 422, message: 'Esta OS já está cancelada.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.osCorretiva.update({
      where: { tenantId_id: { tenantId, id: osId } },
      data: {
        status: 'Cancelada',
        motivoCancelamento: motivoCancelamento.trim(),
        dataHoraCancelamento: new Date(),
        canceladoPorId: usuarioId,
      },
    });

    await liberarEquipamentoSeNecessario(tx, os);
  });

  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: os.equipamentoId,
    tipoEvento: 'os_corretiva_cancelada',
    categoria: 'manutencao',
    subcategoria: os.tipo,
    titulo: `OS ${os.numeroOS} cancelada`,
    descricao: motivoCancelamento.trim(),
    origem: 'usuario',
    status: 'Cancelada',
    impactaAnalise: false,
    referenciaId: osId,
    referenciaTipo: 'os_corretiva',
    metadata: { motivoCancelamento: motivoCancelamento.trim() },
    dataEvento: new Date(),
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'OsCorretiva',
    entidadeId: osId,
    detalhes: `OS ${os.numeroOS} cancelada. Motivo: ${motivoCancelamento.trim()}.${os.statusEquipamentoAbertura !== 'Operante' ? ' Equipamento revertido para Operante.' : ''}`,
  });

  await removerAlertasOsCorretivaDaOS(tenantId, os.numeroOS);
  await reprocessarAlertas(tenantId);

  const completa = await buscarOsPorId({ tenantId, osId });
  return { ok: true, data: completa };
}

// ─── Mover OS para outro equipamento ─────────────────────────────────────────
//
// Caso de uso: OS aberta no equipamento errado por engano. Permite reatribuir
// para outro equipamento do mesmo tenant enquanto a OS estiver em
// {Aberta, EmAndamento}. Cria evento no historico de vida de AMBOS os
// equipamentos (saida do origem, entrada no destino) para rastreabilidade.
//
// Restricoes:
// - status da OS deve ser Aberta ou EmAndamento (apos isso, abrir nova OS)
// - se houver visitas de terceiro, mantem todas (movem junto)
// - reverte status do equipamento ORIGEM para Operante; aplica
//   statusEquipamentoAbertura no DESTINO (tira ele de Operante)
// - motivo eh obrigatorio e fica no audit trail

export async function moverOsEquipamentoService({ tenantId, usuarioId, osId, dados }) {
  const v = validarMoverOsEquipamento(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS Corretiva não encontrada.' };

  const STATUS_PERMITIDOS = ['Aberta', 'EmAndamento'];
  if (!STATUS_PERMITIDOS.includes(os.status)) {
    return {
      ok: false,
      status: 422,
      message: `Só é possível mover OS com status ${STATUS_PERMITIDOS.join(' ou ')}. Status atual: ${os.status}.`,
    };
  }

  if (v.data.novoEquipamentoId === os.equipamentoId) {
    return { ok: false, status: 422, message: 'O novo equipamento é o mesmo da OS atual.' };
  }

  const [origem, destino] = await Promise.all([
    prisma.equipamento.findFirst({
      where: { tenantId, id: os.equipamentoId },
      select: { id: true, tag: true, modelo: true, apelido: true },
    }),
    prisma.equipamento.findFirst({
      where: { tenantId, id: v.data.novoEquipamentoId },
      select: { id: true, tag: true, modelo: true, apelido: true, status: true },
    }),
  ]);

  if (!destino) return { ok: false, status: 404, message: 'Equipamento de destino não encontrado.' };
  if (destino.status === 'Desativado' || destino.status === 'Vendido') {
    return {
      ok: false,
      status: 422,
      message: `Não é possível mover OS para equipamento com status "${destino.status}".`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.osCorretiva.update({
      where: { tenantId_id: { tenantId, id: osId } },
      data: { equipamentoId: v.data.novoEquipamentoId },
    });

    // Reverte equipamento origem para Operante (se estava bloqueado pela OS).
    await tx.equipamento.update({
      where: { id: os.equipamentoId },
      data: { status: 'Operante' },
    });

    // Aplica o status de abertura ao novo equipamento (mesmo status que a OS
    // havia imposto ao original).
    await tx.equipamento.update({
      where: { id: v.data.novoEquipamentoId },
      data: { status: os.statusEquipamentoAbertura },
    });
  });

  const motivo = v.data.motivo.trim();
  const rotuloOrigem = origem ? (origem.apelido || origem.tag || origem.modelo) : 'origem desconhecida';
  const rotuloDestino = destino.apelido || destino.tag || destino.modelo;

  // Evento no equipamento ORIGEM (quem perdeu a OS)
  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: os.equipamentoId,
    tipoEvento: 'os_corretiva_movida_saida',
    categoria: 'manutencao',
    subcategoria: 'reatribuicao',
    titulo: `OS ${os.numeroOS} movida para outro equipamento`,
    descricao: `OS reatribuída para "${rotuloDestino}". Motivo: ${motivo}`,
    origem: 'usuario',
    status: os.status,
    impactaAnalise: true,
    referenciaId: osId,
    referenciaTipo: 'os_corretiva',
    metadata: {
      numeroOS: os.numeroOS,
      direcao: 'saida',
      equipamentoOrigemId: os.equipamentoId,
      equipamentoDestinoId: destino.id,
      equipamentoDestinoRotulo: rotuloDestino,
      motivo,
      usuarioId,
    },
    dataEvento: new Date(),
  });

  // Evento no equipamento DESTINO (quem recebeu a OS)
  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: destino.id,
    tipoEvento: 'os_corretiva_movida_entrada',
    categoria: 'manutencao',
    subcategoria: 'reatribuicao',
    titulo: `OS ${os.numeroOS} recebida de outro equipamento`,
    descricao: `OS reatribuída deste "${rotuloOrigem}". Motivo: ${motivo}`,
    origem: 'usuario',
    status: os.status,
    impactaAnalise: true,
    referenciaId: osId,
    referenciaTipo: 'os_corretiva',
    metadata: {
      numeroOS: os.numeroOS,
      direcao: 'entrada',
      equipamentoOrigemId: os.equipamentoId,
      equipamentoOrigemRotulo: rotuloOrigem,
      equipamentoDestinoId: destino.id,
      motivo,
      usuarioId,
    },
    dataEvento: new Date(),
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'OsCorretiva',
    entidadeId: osId,
    detalhes: `OS ${os.numeroOS} movida de "${rotuloOrigem}" para "${rotuloDestino}". Motivo: ${motivo}`,
  });

  await reprocessarAlertas(tenantId);

  const completa = await buscarOsPorId({ tenantId, osId });
  return { ok: true, data: completa };
}

// ─── Excluir OS (admin only) ──────────────────────────────────────────────────

export async function excluirOsCorretivaService({ tenantId, usuarioId, osId }) {
  const os = await buscarOsResumo({ tenantId, osId });
  if (!os) return { ok: false, status: 404, message: 'OS não encontrada.' };

  if (os.status !== 'Aberta') {
    return {
      ok: false,
      status: 422,
      message: 'Só é possível excluir OS com status "Aberta". Para outras situações, conclua ou arquive a OS.',
    };
  }

  await prisma.$transaction(async (tx) => {
    // Reverte status do equipamento para Operante se a OS estava influenciando.
    await liberarEquipamentoSeNecessario(tx, os);

    await tx.notaAndamento.deleteMany({ where: { tenantId, osCorretivaId: osId } });
    await tx.visitaTerceiro.deleteMany({ where: { tenantId, osCorretivaId: osId } });
    // Limpa eventos do historico do ativo vinculados a essa OS — antes
    // ficava "vestigio" no historico (OS aberta, promovida, concluida
    // ainda apareciam) mesmo apos exclusao. Como exclusao so eh permitida
    // pra OS Aberta, o impacto eh pequeno (poucos eventos), mas a coerencia
    // de auditoria pede limpeza completa.
    await tx.historicoAtivoEvento.deleteMany({
      where: { tenantId, referenciaTipo: 'os_corretiva', referenciaId: osId },
    });
    await tx.osCorretiva.delete({ where: { tenantId_id: { tenantId, id: osId } } });
  });

  await removerAlertasOsCorretivaDaOS(tenantId, os.numeroOS);

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EXCLUSÃO',
    entidade: 'OsCorretiva',
    entidadeId: osId,
    detalhes: `OS ${os.numeroOS} excluída. Status do equipamento revertido para Operante.`,
  });

  return { ok: true };
}
