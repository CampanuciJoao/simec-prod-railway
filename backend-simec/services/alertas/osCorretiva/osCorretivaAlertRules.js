import {
  buscarVisitasComInicioProximo,
  buscarVisitasComFimProximo,
  buscarVisitasVencidasPorTenant,
  upsertAlertaOsCorretiva,
} from './osCorretivaAlertRepository.js';
import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';
import { onAlertasProcessados } from '../alertasEventService.js';

const PONTOS_INICIO = [
  { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA, label: '10min' },
  { limiar: 60, prioridade: ALERT_PRIORIDADES.MEDIA, label: '1h' },
];

const PONTOS_FIM = [
  { limiar: 10, prioridade: ALERT_PRIORIDADES.ALTA, label: '10min' },
  { limiar: 30, prioridade: ALERT_PRIORIDADES.MEDIA, label: '30min' },
];

function equipTag(visita) {
  const eq = visita.osCorretiva?.equipamento;
  return eq?.tag || eq?.nome || 'Equipamento';
}

export async function gerarAlertasVisitaInicioProximo(tenantId, agora) {
  const horizonte = new Date(agora.getTime() + 60 * 60 * 1000);
  const visitas = await buscarVisitasComInicioProximo(tenantId, agora, horizonte);
  let total = 0;

  for (const visita of visitas) {
    const os = visita.osCorretiva;
    const prestador = visita.prestadorNome || 'Terceiro';
    const minRestantes = (new Date(visita.dataHoraInicioPrevista) - agora) / 60000;

    for (const ponto of PONTOS_INICIO) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const alertaId = `os-corretiva-visita-inicio-${tenantId}-${visita.id}-${ponto.label}`;

        const result = await upsertAlertaOsCorretiva(
          tenantId,
          alertaId,
          await criarPayloadBaseAlerta({
            id: alertaId,
            titulo: `Visita prestes a iniciar – ${os?.numeroOS || 'OS'}`,
            subtitulo: `${equipTag(visita)} | ${prestador} — início em ~${ponto.limiar}min`,
            data: visita.dataHoraInicioPrevista,
            prioridade: ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.OS_CORRETIVA,
            tipoEvento: ALERT_EVENTOS.OS_CORRETIVA_VISITA_INICIO_PROXIMO,
            link: `/manutencoes/ocorrencia/${os?.id}`,
          })
        );

        if (result.created || result.updated) {
          await onAlertasProcessados({ tenantsAfetados: [tenantId] });
          total++;
        }

        break;
      }
    }
  }

  return total;
}

export async function gerarAlertasVisitaFimProximo(tenantId, agora) {
  const horizonte = new Date(agora.getTime() + 30 * 60 * 1000);
  const visitas = await buscarVisitasComFimProximo(tenantId, agora, horizonte);
  let total = 0;

  for (const visita of visitas) {
    const os = visita.osCorretiva;
    const prestador = visita.prestadorNome || 'Terceiro';
    const minRestantes = (new Date(visita.dataHoraFimPrevista) - agora) / 60000;

    for (const ponto of PONTOS_FIM) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const alertaId = `os-corretiva-visita-fim-${tenantId}-${visita.id}-${ponto.label}`;

        const result = await upsertAlertaOsCorretiva(
          tenantId,
          alertaId,
          await criarPayloadBaseAlerta({
            id: alertaId,
            titulo: `Visita se aproximando do fim – ${os?.numeroOS || 'OS'}`,
            subtitulo: `${equipTag(visita)} | ${prestador} — encerra em ~${ponto.limiar}min`,
            data: visita.dataHoraFimPrevista,
            prioridade: ponto.prioridade,
            tipoCategoria: ALERT_CATEGORIAS.OS_CORRETIVA,
            tipoEvento: ALERT_EVENTOS.OS_CORRETIVA_VISITA_FIM_PROXIMO,
            link: `/manutencoes/ocorrencia/${os?.id}`,
          })
        );

        if (result.created || result.updated) {
          await onAlertasProcessados({ tenantsAfetados: [tenantId] });
          total++;
        }

        break;
      }
    }
  }

  return total;
}

export async function gerarAlertaVisitaVencida(tenantId, visita) {
  const os = visita.osCorretiva;
  const prestador = visita.prestadorNome || 'Terceiro';

  const alertaId = `os-corretiva-visita-vencida-${tenantId}-${visita.id}`;

  const result = await upsertAlertaOsCorretiva(
    tenantId,
    alertaId,
    await criarPayloadBaseAlerta({
      id: alertaId,
      titulo: `Visita vencida – ${os?.numeroOS || 'OS'}`,
      subtitulo: `${equipTag(visita)} | ${prestador} — prazo venceu, registrar resultado`,
      data: visita.dataHoraFimPrevista,
      prioridade: ALERT_PRIORIDADES.ALTA,
      tipoCategoria: ALERT_CATEGORIAS.OS_CORRETIVA,
      tipoEvento: ALERT_EVENTOS.OS_CORRETIVA_VISITA_VENCIDA,
      link: `/manutencoes/ocorrencia/${os?.id}`,
    })
  );

  if (result.created || result.updated) {
    await onAlertasProcessados({ tenantsAfetados: [tenantId] });
  }

  return 1;
}
