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
  validarAgendarVisita,
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

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'NotaAndamento',
    entidadeId: nota.id,
    detalhes: `Nota adicionada à OS ${os.numeroOS}.`,
  });

  return { ok: true, status: 201, data: nota };
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

// ─── Registrar resultado de visita ───────────────────────────────────────────

export async function registrarResultadoVisitaService({ tenantId, usuarioId, osId, visitaId, dados }) {
  const v = validarRegistrarResultado(dados);
  if (!v.ok) return { ok: false, status: 400, message: v.message, fieldErrors: v.fieldErrors };

  const visita = await buscarVisitaPorId({ tenantId, visitaId });
  if (!visita) return { ok: false, status: 404, message: 'Visita não encontrada.' };
  if (visita.osCorretiva.id !== osId) {
    return { ok: false, status: 422, message: 'Visita não pertence a esta OS.' };
  }
  if (visita.status === 'Concluida' || visita.status === 'PrazoEstendido') {
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

  } else {
    // PrazoEstendido — cria nova visita
    await atualizarVisita({
      tenantId,
      visitaId,
      data: {
        status: 'PrazoEstendido',
        resultado: 'PrazoEstendido',
        observacoes: v.data.observacoes || null,
        dataHoraFimReal: new Date(),
      },
    });

    await criarVisitaTerceiro({
      tenantId,
      osId,
      prestadorNome: visita.prestadorNome,
      dataHoraInicioPrevista: v.data.novaDataHoraInicioPrevista,
      dataHoraFimPrevista: v.data.novaDataHoraFimPrevista,
    });

    // Mantém status AguardandoTerceiro
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

  const dataHoraConclusao = v.data.dataHoraConclusao
    ? new Date(v.data.dataHoraConclusao)
    : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.osCorretiva.update({
      where: { tenantId_id: { tenantId, id: osId } },
      data: {
        status: 'Concluida',
        dataHoraConclusao,
        observacoesFinais: v.data.observacoesFinais || null,
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
    dataEvento: dataHoraConclusao,
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
