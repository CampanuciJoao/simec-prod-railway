import { upsertAlertaOsCorretiva } from './osCorretivaAlertRepository.js';
import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';
import { onAlertasProcessados } from '../alertasEventService.js';

function buildOsCorretivaAlertId(tenantId, visitaId) {
  return `os-corretiva-visita-vencida-${tenantId}-${visitaId}`;
}

export async function gerarAlertaVisitaVencida(tenantId, visita) {
  const os = visita.osCorretiva;
  const equipTag = os?.equipamento?.tag || os?.equipamento?.nome || 'Equipamento';
  const prestador = visita.prestadorNome || 'Terceiro';

  const alertaId = buildOsCorretivaAlertId(tenantId, visita.id);

  const payload = await criarPayloadBaseAlerta({
    id: alertaId,
    titulo: `Visita vencida – ${os?.numeroOS || 'OS'}`,
    subtitulo: `${equipTag} | ${prestador} — prazo venceu, registrar resultado`,
    data: visita.dataHoraFimPrevista,
    prioridade: ALERT_PRIORIDADES.ALTA,
    tipoCategoria: ALERT_CATEGORIAS.OS_CORRETIVA,
    tipoEvento: ALERT_EVENTOS.OS_CORRETIVA_VISITA_VENCIDA,
    link: `/manutencoes/ocorrencia/${os?.id}`,
  });

  const result = await upsertAlertaOsCorretiva(tenantId, alertaId, payload);

  if (result.created || result.updated) {
    await onAlertasProcessados({ tenantsAfetados: [tenantId] });
  }

  return 1;
}
