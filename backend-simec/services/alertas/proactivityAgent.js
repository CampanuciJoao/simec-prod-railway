import prisma from '../prismaService.js';
import { generateJsonWithLlm, getLlmRuntimeInfo } from '../ai/llmService.js';
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
      select: { id: true, modelo: true, tag: true, setor: true, riskScore: true, unidade: { select: { nomeSistema: true } } },
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
        equipamento: { select: { id: true, modelo: true, tag: true, unidade: { select: { nomeSistema: true } } } },
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
      select: { id: true, modelo: true, tag: true, setor: true, unidade: { select: { nomeSistema: true } } },
      take: 5,
    }),
  ]);

  return { equipamentosRisco, manutencoesPendentes, equipamentosSemManutencao };
}

function rotuloEquipamento(e) {
  const tag = e.tag ? ` [${e.tag}]` : '';
  const unid = e.unidade?.nomeSistema ? ` — ${e.unidade.nomeSistema}` : '';
  return `${e.modelo}${tag}${unid}`;
}

function montarResumoContexto({ equipamentosRisco, manutencoesPendentes, equipamentosSemManutencao }) {
  const linhas = [];

  if (equipamentosRisco.length > 0) {
    linhas.push(`Equipamentos com risco alto (${equipamentosRisco.length}):`);
    for (const e of equipamentosRisco) {
      linhas.push(`  - ${rotuloEquipamento(e)} (setor: ${e.setor || '-'}) score=${e.riskScore ?? '?'}`);
    }
  }

  if (manutencoesPendentes.length > 0) {
    linhas.push(`\nOS agendadas atrasadas (${manutencoesPendentes.length}):`);
    for (const m of manutencoesPendentes) {
      const dt = m.dataHoraAgendamentoInicio?.toISOString().slice(0, 10) || '-';
      linhas.push(`  - OS ${m.numeroOS} | ${m.tipo} | ${rotuloEquipamento(m.equipamento || {})} | previsto: ${dt}`);
    }
  }

  if (equipamentosSemManutencao.length > 0) {
    linhas.push(`\nEquipamentos sem manutenção nos últimos 90 dias (${equipamentosSemManutencao.length}):`);
    for (const e of equipamentosSemManutencao) {
      linhas.push(`  - ${rotuloEquipamento(e)} (setor: ${e.setor || '-'})`);
    }
  }

  return linhas.length > 0 ? linhas.join('\n') : null;
}

// Indexa equipamentos por tag/modelo para casar com o que o LLM retornou
function indexarEquipamentosDoContexto(contexto) {
  const map = new Map(); // chaveLower -> { id, label }
  const adicionar = (e) => {
    if (!e?.id) return;
    const label = rotuloEquipamento(e);
    if (e.tag) map.set(String(e.tag).toLowerCase(), { id: e.id, label });
    if (e.modelo) map.set(String(e.modelo).toLowerCase(), { id: e.id, label });
  };
  contexto.equipamentosRisco.forEach(adicionar);
  contexto.equipamentosSemManutencao.forEach(adicionar);
  contexto.manutencoesPendentes.forEach((m) => adicionar(m.equipamento));
  return map;
}

function resolverEquipamentosDoInsight(refsLLM, indice) {
  if (!Array.isArray(refsLLM)) return [];
  const vistos = new Set();
  const out = [];
  for (const ref of refsLLM) {
    if (typeof ref !== 'string') continue;
    const chave = ref.trim().toLowerCase();
    const match = indice.get(chave);
    if (match && !vistos.has(match.id)) {
      vistos.add(match.id);
      out.push(match);
    }
  }
  return out;
}

async function gerarInsightsComLlm(resumo) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) return [];

  const prompt = `Você é um especialista em gestão de manutenção hospitalar. Com base nos dados abaixo, gere de 1 a 3 insights operacionais acionáveis e concisos.

Dados do sistema:
${resumo}

Retorne APENAS um JSON com esta estrutura:
[
  {
    "titulo": "Título curto do insight",
    "subtitulo": "Descrição acionável em uma linha (NÃO escreva 'os 5 equipamentos listados' — cite tags/modelos concretos quando aplicável)",
    "prioridade": "Alta",
    "equipamentos": ["TAG ou MODELO exato", "..."]
  }
]

Regras:
- "equipamentos" é OBRIGATÓRIO quando o insight se refere a um conjunto específico do contexto. Use a TAG (entre colchetes nos dados) se disponível, senão o MODELO. Não invente equipamentos.
- Se o insight for sistêmico (não vinculado a um equipamento específico), retorne "equipamentos": [].
- Valores possíveis para prioridade: "Alta", "Media", "Baixa".
- Gere apenas insights relevantes e práticos, em português.`;

  try {
    const resultado = await generateJsonWithLlm(prompt);
    return Array.isArray(resultado) ? resultado : [];
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

    const indiceEquipamentos = indexarEquipamentosDoContexto(contexto);

    for (let i = 0; i < insights.length; i++) {
      const { titulo, subtitulo, prioridade, equipamentos } = insights[i];
      if (!titulo) continue;

      const alertaId = gerarAlertaId(tenantId, i);
      const jaExiste = await alertaJaExiste(alertaId);
      if (jaExiste) continue;

      const eqsResolvidos = resolverEquipamentosDoInsight(equipamentos, indiceEquipamentos);

      // Subtitulo enriquecido: anexa lista de equipamentos quando o LLM
      // citou referencias e elas casaram com o contexto.
      let subtituloFinal = subtitulo || null;
      if (eqsResolvidos.length > 0) {
        const lista = eqsResolvidos.slice(0, 5).map((e) => e.label).join(' • ');
        const sufixo = eqsResolvidos.length > 5 ? ` (+${eqsResolvidos.length - 5})` : '';
        subtituloFinal = subtituloFinal
          ? `${subtituloFinal} — Equipamentos: ${lista}${sufixo}`
          : `Equipamentos: ${lista}${sufixo}`;
      }

      // Ação sugerida pela recomendacao — define o CTA contextual do card no
      // front. Valores reconhecidos:
      //   - 'editar'             → abre cadastro do equipamento (dados incompletos)
      //   - 'agendar_preventiva' → CTA "Agendar preventiva" (whitelist)
      //   - 'detalhes' (default) → CTA "Ver ficha técnica" apenas
      // O LLM não emite isso estruturado; classificamos por título.
      const tituloLower = (titulo || '').toLowerCase();
      let acaoSugerida;
      if (/cadastr|preench|dados\s+(incompletos|cadastrais|faltantes)|complement/i.test(tituloLower)) {
        acaoSugerida = 'editar';
      } else if (/preventiva|programar|agend|cronograma|periodicidade|vencendo|atrasad/i.test(tituloLower)) {
        acaoSugerida = 'agendar_preventiva';
      } else {
        acaoSugerida = 'detalhes';
      }

      // Link primário do card. Para 'editar' e 'detalhes' aponta para o
      // equipamento; para 'agendar_preventiva' a navegação acontece via botão
      // dedicado no front (com state preenchido), então caímos em 'detalhes'
      // para o link principal.
      const acaoParaLink = acaoSugerida === 'agendar_preventiva' ? 'detalhes' : acaoSugerida;
      const link = eqsResolvidos.length === 1
        ? `/equipamentos/${acaoParaLink}/${eqsResolvidos[0].id}`
        : '/equipamentos';

      // Metadata para hyperlinks clicaveis no card. Salva como JSON serializado.
      // equipamentos[].acao é o prefixo de rota usado pelos chips (não pode ser
      // 'agendar_preventiva' que não é rota de equipamento). acaoSugerida no
      // nível do alerta carrega a intenção para o CTA contextual no front.
      const metadataJson = eqsResolvidos.length > 0
        ? JSON.stringify({
            equipamentos: eqsResolvidos.map((e) => ({
              id: e.id,
              label: e.label,
              acao: acaoParaLink,
            })),
            acaoSugerida,
          })
        : null;

      await prisma.alerta.create({
        data: {
          id: alertaId,
          tenantId,
          titulo,
          subtitulo: subtituloFinal,
          data: new Date(),
          prioridade: prioridade || ALERT_PRIORIDADES.MEDIA,
          tipo: 'Recomendação',
          tipoCategoria: TIPOCATEGORIA_INSIGHT,
          tipoEvento: TIPOEVENTO_INSIGHT,
          link,
          emailEnviado: false,
          metadataJson,
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

  const resultados = await Promise.allSettled(tenants.map(processarTenant));

  let totalCriados = 0;
  const tenantsAfetados = [];

  resultados.forEach((resultado, index) => {
    if (resultado.status === 'rejected') {
      console.error(`[PROACTIVITY_AGENT] Tenant ${tenants[index].id} falhou:`, resultado.reason?.message);
      return;
    }
    const criados = resultado.value;
    if (criados > 0) {
      totalCriados += criados;
      tenantsAfetados.push(tenants[index].id);
      console.log(`[PROACTIVITY_AGENT] Tenant ${tenants[index].nome}: ${criados} insight(s) criado(s)`);
    }
  });

  return { total: totalCriados, tenantsAfetados };
}
