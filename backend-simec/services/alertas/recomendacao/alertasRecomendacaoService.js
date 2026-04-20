import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';

import {
  calcularScoreRisco,
  definirPrioridade,
  deveRecomendar,
} from './recomendacaoAlertScoring.js';

import {
  montarTituloRecomendacao,
  montarSubtituloRecomendacao,
  montarResumoAnalitico,
  buildRecomendacaoAlertId,
  JANELA_DIAS,
} from './recomendacaoAlertFormatter.js';

import {
  buscarEquipamentosComHistorico,
  upsertAlertaRecomendacao,
} from './recomendacaoAlertRepository.js';

import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
} from '../alertPayloadFactory.js';

import {
  getCurrentLocalDate,
  addDaysToLocalDate,
  localDateToUtcStartOfDay,
} from '../../time/index.js';

import { onAlertasProcessados } from '../alertasEventService.js';

/**
 * 🔧 Processa tenant
 */
async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const hojeLocal = getCurrentLocalDate({
    timezone,
    now: agoraUtc,
  });

  if (!hojeLocal) return { total: 0, afetou: false };

  const dataCorteLocal = addDaysToLocalDate(hojeLocal, -JANELA_DIAS);
  const dataCorteUtc = localDateToUtcStartOfDay({
    dateLocal: dataCorteLocal,
    timezone,
  });

  if (!dataCorteUtc) return { total: 0, afetou: false };

  const equipamentos = await buscarEquipamentosComHistorico(
    tenant.id,
    dataCorteUtc
  );

  let total = 0;

  const results = await Promise.all(
    equipamentos.map(async (equipamento) => {
      const unidadeNome = equipamento.unidade?.nomeSistema || 'N/A';

      const metricas = calcularScoreRisco({
        equipamento,
        unidadeNome,
        ocorrencias: equipamento.ocorrencias || [],
        manutencoes: equipamento.manutencoes || [],
        historicoEventos: equipamento.historicoEventos || [],
      });

      if (!deveRecomendar({ metricas })) {
        return 0;
      }

      const alertaId = buildRecomendacaoAlertId(
        tenant.id,
        equipamento.id,
        agoraUtc
      );

      const titulo = montarTituloRecomendacao(unidadeNome);

      const subtitulo = montarSubtituloRecomendacao({
        equipamento,
        unidadeNome,
        metricas,
      });

      const descricaoAnalitica = montarResumoAnalitico({
        equipamento,
        unidadeNome,
        metricas,
      });

      const result = await upsertAlertaRecomendacao(
        tenant.id,
        alertaId,
        await criarPayloadBaseAlerta({
          id: alertaId,
          titulo,
          subtitulo: `${subtitulo}. ${descricaoAnalitica}`,
          data: agoraUtc,
          prioridade: definirPrioridade(metricas.scoreFinal),
          tipoCategoria: ALERT_CATEGORIAS.RECOMENDACAO,
          tipoEvento: ALERT_EVENTOS.RECOM_PREVENTIVA,
          link: `/equipamentos/ficha-tecnica/${equipamento.id}`,

          contexto: {
            equipamentoId: equipamento.id,
            tenantId: tenant.id,
          },

          metadata: {
            score: metricas.scoreFinal,
            tipo: 'recomendacao',
            criticidade:
              metricas.scoreFinal > 80
                ? 'Critico'
                : metricas.scoreFinal > 60
                ? 'Alto'
                : metricas.scoreFinal > 40
                ? 'Moderado'
                : 'Baixo',
          },
        })
      );

      if (result.created || result.updated) {
        await onAlertasProcessados({
          tenantsAfetados: [tenant.id],
        });

        console.log(
          `[ALERTA_RECOMENDACAO][${tenant.id}] ${equipamento.modelo} | score=${metricas.scoreFinal}`
        );

        return 1;
      }

      return 0;
    })
  );

  total = results.reduce((acc, val) => acc + val, 0);

  return {
    total,
    afetou: total > 0,
  };
}

export async function gerarAlertasRecomendacaoDoTenant(
  tenantId,
  timezone = 'America/Campo_Grande',
  agoraUtc = getAgora()
) {
  const resultado = await processarTenant(
    {
      id: tenantId,
      timezone,
    },
    agoraUtc
  );

  return {
    total: resultado.total,
    tenantsAfetados: resultado.afetou ? [tenantId] : [],
  };
}

/**
 * 🌍 Orquestrador global
 */
export async function gerarAlertasRecomendacao() {
  const agoraUtc = getAgora();

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: {
      id: true,
      timezone: true,
    },
  });

  let totalGlobal = 0;
  const tenantsAfetados = [];

  const results = await Promise.all(
    tenants.map((tenant) =>
      processarTenant(tenant, agoraUtc).then((res) => ({
        tenantId: tenant.id,
        ...res,
      }))
    )
  );

  for (const result of results) {
    totalGlobal += result.total;

    if (result.afetou) {
      tenantsAfetados.push(result.tenantId);
    }
  }

  console.log(
    `[ALERTA_RECOMENDACAO] TOTAL=${totalGlobal} | tenantsAfetados=${tenantsAfetados.length}`
  );

  return {
    total: totalGlobal,
    tenantsAfetados,
  };
}

export default gerarAlertasRecomendacao;
