import prisma from '../../prismaService.js';

function alertaMudou(existente, data) {
  return (
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.subtituloBase !== data.subtituloBase ||
    existente.numeroOS !== data.numeroOS ||
    String(existente.dataHoraAgendamentoInicio) !==
      String(data.dataHoraAgendamentoInicio) ||
    String(existente.dataHoraAgendamentoFim) !==
      String(data.dataHoraAgendamentoFim) ||
    existente.prioridade !== data.prioridade ||
    String(existente.data) !== String(data.data) ||
    existente.tipo !== data.tipo ||
    existente.tipoCategoria !== data.tipoCategoria ||
    existente.tipoEvento !== data.tipoEvento ||
    existente.link !== data.link
  );
}

export async function buscarSegurosAtivosPorTenant(tenantId) {
  return prisma.seguro.findMany({
    where: {
      tenantId,
      status: { in: ['Ativo', 'Vigente'] },
    },
    include: {
      equipamento: { select: { modelo: true } },
      unidade:     { select: { nomeSistema: true } },
    },
  });
}

export async function buscarConflitosCoberturaPorTenant(tenantId) {
  const hoje = new Date();

  const seguros = await prisma.seguro.findMany({
    where: {
      tenantId,
      status: { in: ['Ativo', 'Vigente'] },
      dataFim: { gte: hoje },
    },
    select: {
      id: true,
      unidadeId: true,
      equipamentoId: true,
      dataInicio: true,
      dataFim: true,
      apoliceNumero: true,
      unidade:     { select: { nomeSistema: true } },
      equipamento: { select: { modelo: true } },
    },
  });

  const porUnidade     = new Map();
  const porEquipamento = new Map();

  for (const s of seguros) {
    if (s.unidadeId) {
      if (!porUnidade.has(s.unidadeId)) porUnidade.set(s.unidadeId, []);
      porUnidade.get(s.unidadeId).push(s);
    }
    if (s.equipamentoId) {
      if (!porEquipamento.has(s.equipamentoId)) porEquipamento.set(s.equipamentoId, []);
      porEquipamento.get(s.equipamentoId).push(s);
    }
  }

  const conflitos = [];
  const visto = new Set();

  for (const lista of [...porUnidade.values(), ...porEquipamento.values()]) {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i];
        const b = lista[j];
        const parKey = [a.id, b.id].sort().join('_');
        if (visto.has(parKey)) continue;
        // Sobreposição real (toque de fronteira = renovação = permitido)
        if (a.dataInicio < b.dataFim && b.dataInicio < a.dataFim) {
          conflitos.push([a, b]);
          visto.add(parKey);
        }
      }
    }
  }

  return conflitos;
}

export async function upsertAlertaSeguro(tenantId, alertaId, data) {
  const existente = await prisma.alerta.findUnique({
    where: { id: alertaId },
    select: {
      titulo: true,
      subtitulo: true,
      subtituloBase: true,
      numeroOS: true,
      dataHoraAgendamentoInicio: true,
      dataHoraAgendamentoFim: true,
      prioridade: true,
      data: true,
      tipo: true,
      tipoCategoria: true,
      tipoEvento: true,
      link: true,
    },
  });

  if (!existente) {
    await prisma.alerta.create({
      data: {
        tenantId,
        id: alertaId,
        ...data,
      },
    });

    return { created: true, updated: false };
  }

  if (!alertaMudou(existente, data)) {
    return { created: false, updated: false };
  }

  await prisma.alerta.update({
    where: { id: alertaId },
    data: {
      tenantId,
      ...data,
    },
  });

  return { created: false, updated: true };
}
