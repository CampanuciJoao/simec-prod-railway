import prisma from '../../prismaService.js';
import { ALERT_CATEGORIAS } from '../alertTypes.js';

const VISITA_SELECT = {
  id: true,
  osCorretivaId: true,
  prestadorNome: true,
  dataHoraInicioPrevista: true,
  dataHoraFimPrevista: true,
  osCorretiva: {
    select: {
      id: true,
      numeroOS: true,
      equipamento: { select: { tag: true, modelo: true } },
    },
  },
};

// Filtro defensivo: visitas cuja OS-âncora ainda está viva.
// Evita gerar alertas para OSs que já foram concluídas/canceladas.
const OS_ATIVA = { status: { notIn: ['Concluida', 'Cancelada'] } };

export async function buscarVisitasComInicioProximo(tenantId, agora, horizonte) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraInicioPrevista: { gt: agora, lte: horizonte },
      osCorretiva: OS_ATIVA,
    },
    select: VISITA_SELECT,
  });
}

export async function buscarVisitasParaInicioAutomatico(tenantId, agora) {
  const margemInicio = new Date(agora.getTime() + 60_000);
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraInicioPrevista: { lte: margemInicio },
      dataHoraFimPrevista: { gt: agora },
      osCorretiva: OS_ATIVA,
    },
    select: VISITA_SELECT,
  });
}

export async function buscarVisitasParaConfirmacao(tenantId, agora) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'EmExecucao',
      dataHoraFimPrevista: { lte: agora },
      osCorretiva: OS_ATIVA,
    },
    select: VISITA_SELECT,
  });
}

export async function atualizarStatusVisitaParaEmExecucao(tenantId, visitaId) {
  await prisma.visitaTerceiro.update({
    where: { id: visitaId, tenantId },
    data: {
      status: 'EmExecucao',
      dataHoraInicioReal: new Date(),
    },
  });
}

export async function buscarVisitasComFimProximo(tenantId, agora, horizonte) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'EmExecucao',
      dataHoraFimPrevista: { gt: agora, lte: horizonte },
      osCorretiva: OS_ATIVA,
    },
    select: VISITA_SELECT,
  });
}

export async function buscarVisitasVencidasPorTenant(tenantId, agora) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraFimPrevista: { lt: agora },
      osCorretiva: OS_ATIVA,
    },
    select: VISITA_SELECT,
  });
}

// Remove todos os alertas de OS Corretiva associados a um numeroOS.
// Espelha o padrão de `removerAlertasManutencaoDaOS` em manutencaoAlertRepository.js
// e deve ser chamado em toda transição da OS para estado terminal (Concluida/Cancelada/excluída).
export async function removerAlertasOsCorretivaDaOS(tenantId, numeroOS) {
  if (!tenantId || !numeroOS) return { count: 0 };

  return prisma.alerta.deleteMany({
    where: {
      tenantId,
      tipoCategoria: ALERT_CATEGORIAS.OS_CORRETIVA,
      numeroOS,
    },
  });
}

// Compactação defensiva: varre alertas de OS Corretiva cujo numeroOS aponta para
// uma OS já em estado terminal e remove. Usado pelo orchestrator como rede de
// segurança caso algum fluxo futuro esqueça de chamar removerAlertasOsCorretivaDaOS.
export async function compactarAlertasOsCorretivaTerminais(tenantId) {
  const osTerminais = await prisma.osCorretiva.findMany({
    where: { tenantId, status: { in: ['Concluida', 'Cancelada'] } },
    select: { numeroOS: true },
  });

  if (osTerminais.length === 0) return { count: 0 };

  return prisma.alerta.deleteMany({
    where: {
      tenantId,
      tipoCategoria: ALERT_CATEGORIAS.OS_CORRETIVA,
      numeroOS: { in: osTerminais.map((o) => o.numeroOS) },
    },
  });
}

function alertaMudou(existente, data) {
  return (
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.prioridade !== data.prioridade ||
    existente.tipoEvento !== data.tipoEvento ||
    existente.link !== data.link
  );
}

export async function upsertAlertaOsCorretiva(tenantId, alertaId, data) {
  const existente = await prisma.alerta.findUnique({
    where: { id: alertaId },
    select: {
      titulo: true,
      subtitulo: true,
      prioridade: true,
      tipoEvento: true,
      link: true,
    },
  });

  if (!existente) {
    await prisma.alerta.create({ data: { tenantId, id: alertaId, ...data } });
    return { created: true, updated: false };
  }

  if (!alertaMudou(existente, data)) {
    return { created: false, updated: false };
  }

  await prisma.alerta.update({ where: { id: alertaId }, data: { tenantId, ...data } });
  return { created: false, updated: true };
}