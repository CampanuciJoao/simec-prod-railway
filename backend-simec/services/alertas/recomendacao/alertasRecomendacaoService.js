import prisma from '../../prismaService.js';
import { addDays } from 'date-fns';
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

// 🔥 NOVO PADRÃO
import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
} from '../alertPayloadFactory.js';

async function processarTenant(tenantId, agora) {
  const dataCorte = addDays(agora, -JANELA_DIAS);

  const equipamentos = await buscarEquipamentosComHistorico(
    tenantId,
    dataCorte
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
      tenantId,
      equipamento.id,
      agora
    );

    const jaExiste = await existeAlerta(tenantId, alertaId);
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
      tenantId,
      criarPayloadBaseAlerta({
        id: alertaId,
        titulo,
        subtitulo: `${subtitulo}. ${descricaoAnalitica}`,
        data: agora,
        prioridade: definirPrioridade(metricas.scoreFinal),

        // 🔥 PADRÃO NOVO
        tipoCategoria: ALERT_CATEGORIAS.RECOMENDACAO,
        tipoEvento: ALERT_EVENTOS.RECOM_PREVENTIVA,

        link: `/equipamentos/ficha-tecnica/${equipamento.id}`,
      })
    );

    total += 1;

    console.log(
      `[ALERTA_RECOMENDACAO][${tenantId}] Criado para ${equipamento.modelo} (${equipamento.id}) | score=${metricas.scoreFinal} | unidade=${unidadeNome}`
    );
  }

  return total;
}

export async function gerarAlertasRecomendacao() {
  const agora = getAgora();

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;

  for (const tenant of tenants) {
    const totalTenant = await processarTenant(tenant.id, agora);
    totalGlobal += totalTenant;
  }

  console.log(`[ALERTA_RECOMENDACAO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}

export default gerarAlertasRecomendacao;