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
  existeAlerta,
  criarAlertaRecomendacao,
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

async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const hojeLocal = getCurrentLocalDate({
    timezone,
    now: agoraUtc,
  });

  if (!hojeLocal) {
    console.warn(
      `[ALERTA_RECOMENDACAO][${tenant.id}] Não foi possível calcular hojeLocal`
    );
    return 0;
  }

  const dataCorteLocal = addDaysToLocalDate(hojeLocal, -JANELA_DIAS);
  const dataCorteUtc = localDateToUtcStartOfDay({
    dateLocal: dataCorteLocal,
    timezone,
  });

  if (!dataCorteUtc) {
    console.warn(
      `[ALERTA_RECOMENDACAO][${tenant.id}] Não foi possível calcular dataCorteUtc`
    );
    return 0;
  }

  const equipamentos = await buscarEquipamentosComHistorico(
    tenant.id,
    dataCorteUtc
  );

  let total = 0;

  for (const equipamento of equipamentos) {
    const unidadeNome = equipamento.unidade?.nomeSistema || 'N/A';
    const ocorrenciasRecentes = equipamento.ocorrencias || [];
    const manutencoesRecentes = equipamento.manutencoes || [];

    const metricas = calcularScoreRisco({
      equipamento,
      unidadeNome,
      ocorrencias: ocorrenciasRecentes,
      manutencoes: manutencoesRecentes,
    });

    if (!deveRecomendar({ metricas })) {
      continue;
    }

    const alertaId = buildRecomendacaoAlertId(
      tenant.id,
      equipamento.id,
      agoraUtc
    );

    const jaExiste = await existeAlerta(tenant.id, alertaId);
    if (jaExiste) {
      continue;
    }

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

    await criarAlertaRecomendacao(
      tenant.id,
      criarPayloadBaseAlerta({
        id: alertaId,
        titulo,
        subtitulo: `${subtitulo}. ${descricaoAnalitica}`,
        data: agoraUtc,
        prioridade: definirPrioridade(metricas.scoreFinal),
        tipoCategoria: ALERT_CATEGORIAS.RECOMENDACAO,
        tipoEvento: ALERT_EVENTOS.RECOM_PREVENTIVA,
        link: `/equipamentos/ficha-tecnica/${equipamento.id}`,
      })
    );

    total += 1;

    console.log(
      `[ALERTA_RECOMENDACAO][${tenant.id}] Criado para ${equipamento.modelo} (${equipamento.id}) | score=${metricas.scoreFinal} | unidade=${unidadeNome} | timezone=${timezone}`
    );
  }

  return total;
}

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

  for (const tenant of tenants) {
    const totalTenant = await processarTenant(tenant, agoraUtc);
    totalGlobal += totalTenant;
  }

  console.log(`[ALERTA_RECOMENDACAO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}

export default gerarAlertasRecomendacao;