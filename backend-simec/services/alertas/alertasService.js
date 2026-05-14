import prisma from '../prismaService.js';
import {
  listarAlertasPaginado,
  contarMetricasAlertas,
  contarAlertasNaoVistosDoUsuario,
  buscarAlertaPorId,
  buscarUsuarioDoTenant,
  buscarLeituraAlerta,
  atualizarLeituraAlerta,
  criarLeituraAlerta,
  buscarAlertaFormatado,
  buscarBaselineNotificacoes,
} from './alertasRepository.js';
import { adaptarAlertaStatus, adaptarListaAlertas } from './alertasAdapter.js';

const STATUS_VALIDOS = new Set(['Visto', 'NaoVisto']);

export async function listarAlertasService({ tenantId, userId, page = 1, pageSize = 25, filtros = {} }) {
  const baseline = await buscarBaselineNotificacoes({ tenantId, userId });

  const [paginado, metricas] = await Promise.all([
    listarAlertasPaginado({ tenantId, userId, baseline, page, pageSize, filtros }),
    contarMetricasAlertas({ tenantId, userId, baseline }),
  ]);

  const totalPages = Math.ceil(paginado.total / pageSize) || 1;

  return {
    ok: true,
    data: {
      data: adaptarListaAlertas(paginado.data),
      total: paginado.total,
      page,
      pageSize,
      totalPages,
      metricas,
    },
  };
}

export async function resumirAlertasService({ tenantId, userId }) {
  const baseline = await buscarBaselineNotificacoes({ tenantId, userId });
  const naoVistos = await contarAlertasNaoVistosDoUsuario({ tenantId, userId, baseline });
  return { ok: true, data: { naoVistos } };
}

// Marca TODOS os alertas do tenant como lidos para o usuario atual.
// Idempotente: chamadas repetidas nao geram efeito colateral (alertas
// ja vistos sao ignorados pelo updateMany; createMany usa skipDuplicates).
export async function marcarTodosAlertasComoVistosService({ tenantId, userId }) {
  if (!tenantId || !userId) {
    return { ok: false, status: 400, message: 'tenantId e userId sao obrigatorios.' };
  }

  const alertas = await prisma.alerta.findMany({
    where: { tenantId },
    select: { id: true },
  });

  if (alertas.length === 0) {
    return { ok: true, data: { atualizados: 0, criados: 0 } };
  }

  const agora = new Date();
  const novasLeituras = alertas.map((a) => ({
    alertaId:  a.id,
    usuarioId: userId,
    tenantId,
    visto:     true,
    dataVisto: agora,
  }));

  const [updateRes, createRes] = await prisma.$transaction([
    // Atualiza leituras que ja existem mas estao como nao-vistas
    prisma.alertaLidoPorUsuario.updateMany({
      where: { tenantId, usuarioId: userId, visto: false },
      data:  { visto: true, dataVisto: agora },
    }),
    // Cria leituras que ainda nao existem (skipDuplicates ignora conflito)
    prisma.alertaLidoPorUsuario.createMany({
      data: novasLeituras,
      skipDuplicates: true,
    }),
  ]);

  return {
    ok: true,
    data: { atualizados: updateRes.count, criados: createRes.count },
  };
}

export async function atualizarStatusAlertaService({ tenantId, userId, alertaId, status }) {
  if (!STATUS_VALIDOS.has(status)) {
    return { ok: false, status: 400, message: "Status invalido. Use 'Visto' ou 'NaoVisto'." };
  }

  const alerta = await buscarAlertaPorId({ tenantId, alertaId });
  if (!alerta) return { ok: false, status: 404, message: 'Alerta nao encontrado.' };

  const usuario = await buscarUsuarioDoTenant({ tenantId, userId });
  if (!usuario) return { ok: false, status: 401, message: 'Usuario invalido para este tenant.' };

  const visto = status === 'Visto';
  const leituraExistente = await buscarLeituraAlerta({ tenantId, alertaId, userId });

  if (leituraExistente) {
    await atualizarLeituraAlerta({ alertaId, userId, visto });
  } else {
    await criarLeituraAlerta({ tenantId, alertaId, userId, visto });
  }

  const alertaAtualizado = await buscarAlertaFormatado({ tenantId, alertaId, userId });
  return { ok: true, data: adaptarAlertaStatus(alertaAtualizado) };
}
