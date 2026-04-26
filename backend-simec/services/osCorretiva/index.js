import prisma from '../prismaService.js';
import { registrarLog } from '../logService.js';
import { registrarEventoHistoricoAtivo } from '../historicoAtivoService.js';
import { enfileirarReprocessamentoAlertasDoTenant } from '../queueService.js';

import {
  buscarOsPorId,
  buscarOsResumo,
  listarOsCorretivas,
  existeOsAbertaParaEquipamento,
  contarOsDoTenant,
  criarOsCorretiva,
  atualizarOsCorretiva,
  criarNotaOsCorretiva,
  criarVisitaTerceiro,
  buscarVisitaPorId,
  atualizarVisita,
} from './osCorretivaRepository.js';

import {
  validarAbrirOs,
  validarNota,
  validarAgendarVisita,
  validarRegistrarResultado,
  validarConcluirOs,
} from '../../validators/osCorretivaValidator.js';

function gerarNumeroOs({ tag, sequencia }) {
  const seq = String(sequencia).padStart(4, '0');
  const tagClean = tag.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  return `OC-${tagClean}-${seq}`;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

async function reprocessarAlertas(tenantId) {
  try {
    void enfileirarReprocessamentoAlertasDoTenant(tenantId, 'os_corretiva_atualizada').catch(() => {});
  } catch {}
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

  if (equipamento.status === 'Desativado') {
    return { ok: false, status: 422, message: 'Não é possível abrir OS para equipamento desativado.' };
  }

  const osAberta = await existeOsAbertaParaEquipamento({ tenantId, equipamentoId: v.data.equipamentoId });
  if (osAberta) {
    return {
      ok: false,
      status: 409,
      message: `Já existe uma OS Corretiva aberta para este equipamento: ${osAberta.numeroOS}.`,
      conflito: { numeroOS: osAberta.numeroOS, id: osAberta.id },
    };
  }

  const total = await contarOsDoTenant(tenantId);
  const numeroOS = gerarNumeroOs({ tag: equipamento.tag, sequencia: total + 1 });

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
      },
    });

    await tx.equipamento.update({
      where: { tenantId_id: { tenantId, id: v.data.equipamentoId } },
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
    metadata: { numeroOS, solicitante: v.data.solicitante, statusEquipamentoAbertura: v.data.statusEquipamentoAbertura },
    dataEvento: novaOs.dataHoraAbertura,
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
    // Encerra a visita e a OS
    await prisma.$transaction(async (tx) => {
      await tx.visitaTerceiro.update({
        where: { tenantId_id: { tenantId, id: visitaId } },
        data: {
          status: 'Concluida',
          resultado: 'Operante',
          observacoes: v.data.observacoes || null,
          dataHoraFimReal: new Date(),
        },
      });

      await tx.osCorretiva.update({
        where: { tenantId_id: { tenantId, id: osId } },
        data: {
          status: 'Concluida',
          dataHoraConclusao: new Date(),
          observacoesFinais: v.data.observacoes || null,
        },
      });

      await tx.equipamento.update({
        where: { tenantId_id: { tenantId, id: os.equipamentoId } },
        data: { status: 'Operante' },
      });
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

  await prisma.$transaction(async (tx) => {
    await tx.osCorretiva.update({
      where: { tenantId_id: { tenantId, id: osId } },
      data: {
        status: 'Concluida',
        dataHoraConclusao: new Date(),
        observacoesFinais: v.data.observacoesFinais || null,
      },
    });

    await tx.equipamento.update({
      where: { tenantId_id: { tenantId, id: os.equipamentoId } },
      data: { status: 'Operante' },
    });
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
    dataEvento: new Date(),
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'OsCorretiva',
    entidadeId: osId,
    detalhes: `OS ${os.numeroOS} concluída. Equipamento retornou a Operante.`,
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
    // Reverte status do equipamento para Operante se a OS estava influenciando
    await tx.equipamento.update({
      where: { tenantId_id: { tenantId, id: os.equipamentoId } },
      data: { status: 'Operante' },
    });

    await tx.notaAndamento.deleteMany({ where: { tenantId, osCorretivaId: osId } });
    await tx.visitaTerceiro.deleteMany({ where: { tenantId, osCorretivaId: osId } });
    await tx.osCorretiva.delete({ where: { tenantId_id: { tenantId, id: osId } } });
  });

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
