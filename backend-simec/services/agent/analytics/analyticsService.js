// AnalyticsService — responde consultas analiticas agregadas do agent.
//
// Cada tipo retorna { mensagem, meta: { preview, contextoPDF? } } no
// mesmo formato do RelatorioService — assim o ChatMessageBubble renderiza
// um card tabular com botao 'Baixar PDF' embutido.
//
// Limites operacionais ([feedback-pdf-limites]):
// - Periodo default: 12 meses
// - Periodo maximo: 36 meses
// - Itens default em rankings: 10 (configuravel via classificador)

import prisma from '../../prismaService.js';
import { generateTextWithLlm, getLlmRuntimeInfo } from '../../ai/llmService.js';

const PERIODO_DEFAULT_MESES = 12;
const PERIODO_MAX_MESES = 36;

const TIPOS_ANALYTICS = [
  'TOP_EQUIPAMENTOS',
  'POR_SETOR',
  'POR_UNIDADE',
  'TENDENCIA_MENSAL',
  'RISCO_ALTO',
  'BACKLOG',
  'TOTAL_PERIODO',
  'DESCONHECIDO',
];

function parsearJson(texto) {
  try {
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Aplica limites no periodo solicitado e retorna metadata para exibir.
function resolverPeriodo(periodo) {
  const fim = periodo?.fim ? new Date(periodo.fim) : new Date();
  const inicioPedido = periodo?.inicio ? new Date(periodo.inicio) : null;

  if (!inicioPedido) {
    const padrao = new Date(fim);
    padrao.setMonth(padrao.getMonth() - PERIODO_DEFAULT_MESES);
    return {
      inicio: padrao,
      fim,
      label: `últimos ${PERIODO_DEFAULT_MESES} meses (default)`,
      capado: false,
    };
  }

  const limiteMin = new Date(fim);
  limiteMin.setMonth(limiteMin.getMonth() - PERIODO_MAX_MESES);
  if (inicioPedido < limiteMin) {
    return {
      inicio: limiteMin,
      fim,
      label: `últimos ${PERIODO_MAX_MESES} meses (período pedido excedia o máximo)`,
      capado: true,
    };
  }

  return {
    inicio: inicioPedido,
    fim,
    label: `${inicioPedido.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`,
    capado: false,
  };
}

function whereDoPeriodo(periodoResolvido) {
  return {
    dataHoraAgendamentoInicio: {
      gte: periodoResolvido.inicio,
      lte: periodoResolvido.fim,
    },
  };
}

async function classificarConsulta(mensagem) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) {
    return { tipo: 'DESCONHECIDO', periodo: null, tipoManutencao: null, limite: 10 };
  }

  const prompt = `Você classifica perguntas analíticas sobre manutenção hospitalar e devolve APENAS JSON.

Schema:
{
  "tipo": "TOP_EQUIPAMENTOS",
  "periodo": { "inicio": "ISO", "fim": "ISO" } | null,
  "tipoManutencao": "Preventiva" | "Corretiva" | null,
  "limite": 10
}

Tipos:
- TOP_EQUIPAMENTOS — quais equipamentos tiveram mais paradas/manutenções/OS/corretivas
- POR_SETOR — distribuição por setor/departamento
- POR_UNIDADE — distribuição por unidade/hospital/filial; "qual unidade teve mais problemas"
- TENDENCIA_MENSAL — evolução mês a mês / como variou ao longo do tempo
- RISCO_ALTO — equipamentos críticos / vulneráveis / com risco
- BACKLOG — manutenções pendentes / em aberto / em atraso
- TOTAL_PERIODO — quantas X tivemos / total de manutenções / contagem direta
- DESCONHECIDO — não se enquadra

Exemplos:
- "qual equipamento mais parou nos últimos 6 meses?" → TOP_EQUIPAMENTOS, periodo=6m, tipo=null, limite=10
- "qual unidade teve mais problemas no último ano?" → POR_UNIDADE, periodo=12m
- "quantas preventivas tivemos no último ano?" → TOTAL_PERIODO, periodo=12m, tipoManutencao=Preventiva
- "quantas corretivas para cada equipamento?" → TOP_EQUIPAMENTOS, tipoManutencao=Corretiva, limite=20
- "como variaram as manutenções nos últimos 3 meses?" → TENDENCIA_MENSAL, periodo=3m
- "equipamentos em manutenção agora" → BACKLOG
- "top 5 críticos" → RISCO_ALTO, limite=5

Use hoje=${new Date().toISOString()}. Período em null = não especificado.

Mensagem: "${String(mensagem).slice(0, 500)}"`;

  try {
    const resposta = await generateTextWithLlm(prompt);
    const parsed = parsearJson(resposta);
    if (!parsed) return { tipo: 'DESCONHECIDO', periodo: null, tipoManutencao: null, limite: 10 };
    return {
      tipo: TIPOS_ANALYTICS.includes(parsed.tipo) ? parsed.tipo : 'DESCONHECIDO',
      periodo: parsed.periodo || null,
      tipoManutencao: parsed.tipoManutencao || null,
      limite: parsed.limite || 10,
    };
  } catch {
    return { tipo: 'DESCONHECIDO', periodo: null, tipoManutencao: null, limite: 10 };
  }
}

// ─── Queries ────────────────────────────────────────────────────────────────

async function topEquipamentos({ tenantId, tipoManutencao, periodo, limite }) {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...whereDoPeriodo(periodo),
    },
    select: {
      equipamentoId: true,
      equipamento: { select: { modelo: true, tag: true, apelido: true, tipo: true } },
    },
  });

  const contagem = {};
  for (const m of manutencoes) {
    const id = m.equipamentoId;
    if (!id) continue;
    if (!contagem[id]) {
      contagem[id] = {
        equipamentoId: id,
        modelo: m.equipamento?.modelo || 'Desconhecido',
        tag: m.equipamento?.tag || '-',
        apelido: m.equipamento?.apelido || null,
        tipo: m.equipamento?.tipo || '-',
        total: 0,
      };
    }
    contagem[id].total++;
  }

  return Object.values(contagem)
    .sort((a, b) => b.total - a.total)
    .slice(0, limite || 10);
}

async function porSetor({ tenantId, tipoManutencao, periodo }) {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...whereDoPeriodo(periodo),
    },
    select: { equipamento: { select: { setor: true } } },
  });

  const contagem = {};
  for (const m of manutencoes) {
    const setor = m.equipamento?.setor || 'Sem setor';
    contagem[setor] = (contagem[setor] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([setor, total]) => ({ setor, total }))
    .sort((a, b) => b.total - a.total);
}

async function porUnidade({ tenantId, tipoManutencao, periodo }) {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...whereDoPeriodo(periodo),
    },
    select: {
      equipamento: { select: { unidade: { select: { nomeSistema: true } } } },
    },
  });

  const contagem = {};
  for (const m of manutencoes) {
    const unidade = m.equipamento?.unidade?.nomeSistema || 'Sem unidade';
    contagem[unidade] = (contagem[unidade] || 0) + 1;
  }
  return Object.entries(contagem)
    .map(([unidade, total]) => ({ unidade, total }))
    .sort((a, b) => b.total - a.total);
}

async function tendenciaMensal({ tenantId, tipoManutencao, periodo }) {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...whereDoPeriodo(periodo),
      dataHoraAgendamentoInicio: {
        gte: periodo.inicio,
        lte: periodo.fim,
        not: null,
      },
    },
    select: { dataHoraAgendamentoInicio: true, tipo: true },
    orderBy: { dataHoraAgendamentoInicio: 'asc' },
  });

  const contagem = {};
  for (const m of manutencoes) {
    const d = new Date(m.dataHoraAgendamentoInicio);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    contagem[chave] = (contagem[chave] || 0) + 1;
  }
  return Object.entries(contagem).map(([mes, total]) => ({ mes, total }));
}

async function riscoAlto({ tenantId, limite }) {
  return prisma.equipamento.findMany({
    where: { tenantId, riskLevel: 'Alto' },
    select: {
      modelo: true, tag: true, apelido: true, tipo: true, riskScore: true, setor: true,
      unidade: { select: { nomeSistema: true } },
    },
    orderBy: { riskScore: 'desc' },
    take: limite || 10,
  });
}

async function backlog({ tenantId }) {
  return prisma.manutencao.findMany({
    where: { tenantId, status: { in: ['Agendada', 'EmProgresso'] } },
    select: {
      id: true, numeroOS: true, tipo: true, status: true,
      dataHoraAgendamentoInicio: true,
      equipamento: {
        select: {
          modelo: true, tag: true, apelido: true,
          unidade: { select: { nomeSistema: true } },
        },
      },
    },
    orderBy: { dataHoraAgendamentoInicio: 'asc' },
    take: 20,
  });
}

// Total simples no periodo, com breakdown por tipo (Preventiva/Corretiva/etc)
async function totalPeriodo({ tenantId, tipoManutencao, periodo }) {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...whereDoPeriodo(periodo),
    },
    select: { tipo: true, status: true },
  });

  const total = manutencoes.length;
  const porTipo = {};
  const porStatus = {};
  for (const m of manutencoes) {
    porTipo[m.tipo || 'N/A'] = (porTipo[m.tipo || 'N/A'] || 0) + 1;
    porStatus[m.status || 'N/A'] = (porStatus[m.status || 'N/A'] || 0) + 1;
  }
  return { total, porTipo, porStatus };
}

// ─── Builders de resposta + preview tabular ────────────────────────────────

function eqLabel(eq) {
  const principal = eq.apelido?.trim() || eq.tipo || eq.modelo || 'Equipamento';
  return eq.tag ? `${principal} (${eq.tag})` : principal;
}

function buildResposta({ titulo, mensagem, colunas, linhas, periodo, filtrosExtras = [], tipoChartId = null }) {
  const filtros = [
    ...filtrosExtras,
    { label: 'Período', value: periodo.label },
  ];
  return {
    mensagem,
    meta: {
      intent: 'ANALYTICS',
      preview: {
        tipo: tipoChartId || 'PREVIEW_ANALYTICS',
        titulo,
        filtros,
        colunas,
        linhas: linhas.slice(0, 10),
        totalLinhasPreview: linhas.length > 10
          ? `Mostrando 10 de ${linhas.length} linhas — o PDF inclui todas.`
          : null,
        resumo: {
          totalIncluido: linhas.length,
          totalEncontrado: linhas.length,
          limitado: false,
          avisoLimite: null,
          avisoPeriodoCapado: periodo.capado
            ? 'Período pedido excedia o máximo (36 meses) — capado automaticamente.'
            : null,
        },
      },
    },
  };
}

function respostaTopEquipamentos(dados, periodo, tipoManutencao) {
  if (!dados.length) {
    return { mensagem: `Não encontrei manutenções no período (${periodo.label}).` };
  }
  const tipoLabel = tipoManutencao ? tipoManutencao.toLowerCase() + 's' : 'manutenções';
  const filtros = tipoManutencao ? [{ label: 'Tipo', value: tipoManutencao }] : [];
  return buildResposta({
    titulo: `Equipamentos com mais ${tipoLabel}`,
    mensagem: `Encontrei ${dados.length} equipamentos com ${tipoLabel} no período (${periodo.label}). O top é **${eqLabel(dados[0])}** com **${dados[0].total}**.`,
    colunas: ['#', 'Equipamento', 'Modalidade', 'Total'],
    linhas: dados.map((e, i) => [
      String(i + 1),
      eqLabel(e),
      e.tipo || '—',
      String(e.total),
    ]),
    periodo,
    filtrosExtras: filtros,
  });
}

function respostaPorUnidade(dados, periodo, tipoManutencao) {
  if (!dados.length) {
    return { mensagem: `Não encontrei manutenções no período (${periodo.label}).` };
  }
  const filtros = tipoManutencao ? [{ label: 'Tipo', value: tipoManutencao }] : [];
  return buildResposta({
    titulo: 'Manutenções por unidade',
    mensagem: `A unidade com mais manutenções no período foi **${dados[0].unidade}** (${dados[0].total}).`,
    colunas: ['Unidade', 'Total'],
    linhas: dados.map((u) => [u.unidade, String(u.total)]),
    periodo,
    filtrosExtras: filtros,
  });
}

function respostaPorSetor(dados, periodo, tipoManutencao) {
  if (!dados.length) {
    return { mensagem: `Não encontrei dados por setor (${periodo.label}).` };
  }
  const filtros = tipoManutencao ? [{ label: 'Tipo', value: tipoManutencao }] : [];
  return buildResposta({
    titulo: 'Manutenções por setor',
    mensagem: `O setor com mais manutenções foi **${dados[0].setor}** (${dados[0].total}).`,
    colunas: ['Setor', 'Total'],
    linhas: dados.map((s) => [s.setor, String(s.total)]),
    periodo,
    filtrosExtras: filtros,
  });
}

function respostaTendencia(dados, periodo, tipoManutencao) {
  if (!dados.length) {
    return { mensagem: `Não encontrei manutenções no período (${periodo.label}).` };
  }
  const filtros = tipoManutencao ? [{ label: 'Tipo', value: tipoManutencao }] : [];
  const total = dados.reduce((s, m) => s + m.total, 0);
  return buildResposta({
    titulo: 'Tendência mensal de manutenções',
    mensagem: `Total de **${total}** manutenções distribuídas em ${dados.length} meses no período (${periodo.label}).`,
    colunas: ['Mês', 'Manutenções'],
    linhas: dados.map((m) => [m.mes, String(m.total)]),
    periodo,
    filtrosExtras: filtros,
  });
}

function respostaRiscoAlto(dados) {
  if (!dados.length) {
    return { mensagem: 'Nenhum equipamento com risco alto cadastrado.' };
  }
  return buildResposta({
    titulo: 'Equipamentos com risco alto',
    mensagem: `Identifiquei **${dados.length}** equipamento(s) com risco alto. O mais crítico é **${eqLabel(dados[0])}** (score ${dados[0].riskScore ?? '—'}).`,
    colunas: ['Equipamento', 'Unidade', 'Setor', 'Score'],
    linhas: dados.map((e) => [
      eqLabel(e),
      e.unidade?.nomeSistema || '—',
      e.setor || '—',
      String(e.riskScore ?? '—'),
    ]),
    periodo: { label: 'estado atual', capado: false },
  });
}

function respostaBacklog(dados) {
  if (!dados.length) {
    return { mensagem: 'Sem manutenções pendentes no momento.' };
  }
  return buildResposta({
    titulo: `Backlog de manutenções (${dados.length})`,
    mensagem: `Há **${dados.length}** manutenções pendentes ou em andamento.`,
    colunas: ['OS', 'Tipo', 'Status', 'Equipamento', 'Unidade'],
    linhas: dados.map((m) => [
      m.numeroOS || '—',
      m.tipo || '—',
      m.status || '—',
      eqLabel(m.equipamento || {}),
      m.equipamento?.unidade?.nomeSistema || '—',
    ]),
    periodo: { label: 'pendentes agora', capado: false },
  });
}

function respostaTotalPeriodo(dados, periodo, tipoManutencao) {
  const tipoLabel = tipoManutencao || 'manutenções';
  if (dados.total === 0) {
    return { mensagem: `Não encontrei ${tipoLabel.toLowerCase()} no período (${periodo.label}).` };
  }

  const tiposLinhas = Object.entries(dados.porTipo).map(([tipo, total]) => [tipo, String(total)]);
  const statusLinhas = Object.entries(dados.porStatus).map(([s, total]) => [s, String(total)]);

  const filtros = tipoManutencao ? [{ label: 'Tipo', value: tipoManutencao }] : [];

  // Tabela compacta combina por tipo + por status
  const linhas = [
    ...tiposLinhas.map(([k, v]) => [`Tipo: ${k}`, v]),
    ['—', '—'],
    ...statusLinhas.map(([k, v]) => [`Status: ${k}`, v]),
  ];

  return buildResposta({
    titulo: `Total de ${tipoManutencao ? tipoManutencao.toLowerCase() + 's' : 'manutenções'} no período`,
    mensagem: `Encontrei **${dados.total}** ${tipoManutencao ? tipoManutencao.toLowerCase() + '(s)' : 'manutenção(ões)'} no período (${periodo.label}).`,
    colunas: ['Categoria', 'Total'],
    linhas,
    periodo,
    filtrosExtras: filtros,
  });
}

// ─── Service publico ────────────────────────────────────────────────────────

export const AnalyticsService = {
  async processar(mensagem, contextoUsuario) {
    const { tenantId } = contextoUsuario;

    const consulta = await classificarConsulta(mensagem);
    const periodo = resolverPeriodo(consulta.periodo);

    console.log(`[ANALYTICS] tipo=${consulta.tipo} periodo=${periodo.label} tipoManut=${consulta.tipoManutencao}`);

    try {
      switch (consulta.tipo) {
        case 'TOP_EQUIPAMENTOS': {
          const dados = await topEquipamentos({
            tenantId, tipoManutencao: consulta.tipoManutencao, periodo, limite: consulta.limite,
          });
          return respostaTopEquipamentos(dados, periodo, consulta.tipoManutencao);
        }
        case 'POR_UNIDADE': {
          const dados = await porUnidade({ tenantId, tipoManutencao: consulta.tipoManutencao, periodo });
          return respostaPorUnidade(dados, periodo, consulta.tipoManutencao);
        }
        case 'POR_SETOR': {
          const dados = await porSetor({ tenantId, tipoManutencao: consulta.tipoManutencao, periodo });
          return respostaPorSetor(dados, periodo, consulta.tipoManutencao);
        }
        case 'TENDENCIA_MENSAL': {
          const dados = await tendenciaMensal({ tenantId, tipoManutencao: consulta.tipoManutencao, periodo });
          return respostaTendencia(dados, periodo, consulta.tipoManutencao);
        }
        case 'RISCO_ALTO': {
          const dados = await riscoAlto({ tenantId, limite: consulta.limite });
          return respostaRiscoAlto(dados);
        }
        case 'BACKLOG': {
          const dados = await backlog({ tenantId });
          return respostaBacklog(dados);
        }
        case 'TOTAL_PERIODO': {
          const dados = await totalPeriodo({ tenantId, tipoManutencao: consulta.tipoManutencao, periodo });
          return respostaTotalPeriodo(dados, periodo, consulta.tipoManutencao);
        }
        default:
          return {
            mensagem:
              'Não consegui identificar o tipo de análise. Tente: "qual equipamento mais parou nos últimos 6 meses?", "quantas preventivas no último ano?", "qual unidade teve mais problemas?", "tendência mensal das corretivas".',
          };
      }
    } catch (err) {
      console.error('[ANALYTICS_ERROR]', err.message);
      return { mensagem: 'Tive um problema ao executar a análise. Poderia reformular a pergunta?' };
    }
  },
};
