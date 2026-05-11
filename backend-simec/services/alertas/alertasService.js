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
