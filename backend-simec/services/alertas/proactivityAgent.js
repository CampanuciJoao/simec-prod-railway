import prisma from '../prismaService.js';
import { generateTextWithLlm, getLlmRuntimeInfo } from '../ai/llmService.js';
import { ALERT_PRIORIDADES } from './alertTypes.js';

const TIPOEVENTO_INSIGHT = 'INSIGHT_IA';
const TIPOCATEGORIA_INSIGHT = 'RECOMENDACAO';

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function gerarAlertaId(tenantId, index) {
  return `insight-ia-${tenantId}-${dataHoje()}-${index}`;
}

async function alertaJaExiste(id) {
  const existente = await prisma.alerta.findUnique({ where: { id }, select: { id: true } });
  return !!existente;
}

async function buscarContextoTenant(tenantId) {
  const [equipamentosRisco, manutencoesPendentes, equipamentosSemManutencao] = await Promise.all([
    prisma.equipamento.findMany({
      where: { tenantId, riskLevel: 'Alto' },
      select: { modelo: true, tag: true, setor: true, riskScore: true, unidade: { select: { nomeSistema: true } } },
      take: 5,
      orderBy: { riskScore: 'desc' },
    }),

    prisma.manutencao.findMany({
      where: {
        tenantId,
        status: 'Agendada',
        dataHoraAgendamentoInicio: { lt: new Date() },
      },
      select: {
        numeroOS: true,
        tipo: true,
        dataHoraAgendamentoInicio: true,
        equipamento: { select: { modelo: true, unidade: { select: { nomeSistema: true } } } },
      },
      take: 10,
      orderBy: { dataHoraAgendamentoInicio: 'asc' },
    }),

    prisma.equipamento.findMany({
      where: {
        tenantId,
        manutencoes: {
          none: {
            dataHoraAgendamentoInicio: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      select: { modelo: true, tag: true, setor: true, unidade: { select: { nomeSistema: true } } },
      take: 5,
    }),
  ]);

  return { equipamentosRisco, manutencoesPendentes, equipamentosSemManutencao };
}

function montarResumoContexto({ equipamentosRisco, manutencoesPendentes, equipamentosSemManutencao }) {
  const linhas = [];

  if (equipamentosRisco.length > 0) {
    linhas.push(`Equipamentos com risco alto (${equipamentosRisco.length}):`);
    for (const e of equipamentosRisco) {
      linhas.push(`  - ${e.modelo} (${e.unidade?.nomeSistema || '-'} / ${e.setor || '-'}) score=${e.riskScore ?? '?'}`);
    }
  }

  if (manutencoesPendentes.length > 0) {
    linhas.push(`\nOS agendadas atrasadas (${manutencoesPendentes.length}):`);
    for (const m of manutencoesPendentes) {
      const dt = m.dataHoraAgendamentoInicio?.toISOString().slice(0, 10) || '-';
      linhas.push(`  - OS ${m.numeroOS} | ${m.tipo} | ${m.equipamento?.modelo || '-'} (${m.equipamento?.unidade?.nomeSistema || '-'}) | previsto: ${dt}`);
    }
  }

  if (equipamentosSemManutencao.length > 0) {
    linhas.push(`\nEquipamentos sem manutenção nos últimos 90 dias (${equipamentosSemManutencao.length}):`);
    for (const e of equipamentosSemManutencao) {
      linhas.push(`  - ${e.modelo} (${e.unidade?.nomeSistema || '-'} / ${e.setor || '-'})`);
    }
  }

  return linhas.length > 0 ? linhas.join('\n') : null;
}

async function gerarInsightsComLlm(resumo) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) return [];

  const prompt = `Você é um especialista em gestão de manutenção hospitalar. Com base nos dados abaixo, gere de 1 a 3 insights operacionais acionáveis e concisos.

Dados do sistema:
${resumo}

Retorne APENAS um JSON com esta estrutura:
[
  { "titulo": "Título curto do insight", "subtitulo": "Descrição acionável em uma linha", "prioridade": "Alta" },
  { "titulo": "...", "subtitulo": "...", "prioridade": "Media" }
]

Valores possíveis para prioridade: "Alta", "Media", "Baixa".
Gere apenas insights relevantes e práticos, em português.`;

  try {
    const resposta = await generateTextWithLlm(prompt);
    const match = resposta.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('[PROACTIVITY_AGENT] Erro ao gerar insights:', err.message);
    return [];
  }
}

async function processarTenant(tenant) {
  const { id: tenantId } = tenant;
  let criados = 0;

  try {
    const contexto = await buscarContextoTenant(tenantId);
    const temDados =
      contexto.equipamentosRisco.length > 0 ||
      contexto.manutencoesPendentes.length > 0 ||
      contexto.equipamentosSemManutencao.length > 0;

    if (!temDados) return 0;

    const resumo = montarResumoContexto(contexto);
    if (!resumo) return 0;

    const insights = await gerarInsightsComLlm(resumo);
    if (!insights.length) return 0;

    for (let i = 0; i < insights.length; i++) {
      const { titulo, subtitulo, prioridade } = insights[i];
      if (!titulo) continue;

      const alertaId = gerarAlertaId(tenantId, i);
      const jaExiste = await alertaJaExiste(alertaId);
      if (jaExiste) continue;

      await prisma.alerta.create({
        data: {
          id: alertaId,
          tenantId,
          titulo,
          subtitulo: subtitulo || null,
          data: new Date(),
          prioridade: prioridade || ALERT_PRIORIDADES.MEDIA,
          tipo: 'Recomendação',
          tipoCategoria: TIPOCATEGORIA_INSIGHT,
          tipoEvento: TIPOEVENTO_INSIGHT,
          emailEnviado: false,
        },
      });

      criados++;
    }
  } catch (err) {
    console.error(`[PROACTIVITY_AGENT] Erro no tenant ${tenantId}:`, err.message);
  }

  return criados;
}

export async function gerarInsightsInteligentes() {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) {
    console.log('[PROACTIVITY_AGENT] LLM indisponível — pulando geração de insights.');
    return { total: 0, tenantsAfetados: [] };
  }

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  console.log(`[PROACTIVITY_AGENT] Processando ${tenants.length} tenant(s)...`);

  let totalCriados = 0;
  const tenantsAfetados = [];

  for (const tenant of tenants) {
    const criados = await processarTenant(tenant);
    if (criados > 0) {
      totalCriados += criados;
      tenantsAfetados.push(tenant.id);
      console.log(`[PROACTIVITY_AGENT] Tenant ${tenant.nome}: ${criados} insight(s) criado(s)`);
    }
  }

  return { total: totalCriados, tenantsAfetados };
}
