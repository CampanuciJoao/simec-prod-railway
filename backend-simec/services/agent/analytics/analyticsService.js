import prisma from '../../prismaService.js';
import { generateTextWithLlm, getLlmRuntimeInfo } from '../../ai/llmService.js';

const TIPOS_ANALYTICS = [
  'TOP_EQUIPAMENTOS',
  'POR_SETOR',
  'POR_UNIDADE',
  'TENDENCIA_MENSAL',
  'RISCO_ALTO',
  'BACKLOG',
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

function periodoParaWhere(periodo) {
  if (!periodo?.inicio && !periodo?.fim) return {};
  return {
    dataHoraAgendamentoInicio: {
      ...(periodo.inicio && { gte: new Date(periodo.inicio) }),
      ...(periodo.fim && { lte: new Date(periodo.fim) }),
    },
  };
}

function periodoUltimoAno() {
  const fim = new Date();
  const inicio = new Date();
  inicio.setFullYear(inicio.getFullYear() - 1);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

async function classificarConsulta(mensagem) {
  const llm = getLlmRuntimeInfo();

  if (!llm.available) {
    return { tipo: 'DESCONHECIDO', periodo: null, tipoManutencao: null, limite: 5 };
  }

  const prompt = `Você é um classificador de consultas analíticas de manutenção hospitalar. Analise a mensagem e retorne APENAS um JSON:

{
  "tipo": "TOP_EQUIPAMENTOS",
  "periodo": { "inicio": "2025-01-01T00:00:00.000Z", "fim": "2026-01-01T00:00:00.000Z" },
  "tipoManutencao": null,
  "limite": 5
}

Tipos disponíveis:
- TOP_EQUIPAMENTOS: quais equipamentos tiveram mais manutenções / mais paradas / mais OS
- POR_SETOR: distribuição por setor / departamento
- POR_UNIDADE: distribuição por unidade / hospital / filial
- TENDENCIA_MENSAL: evolução mês a mês / tendência / histórico mensal
- RISCO_ALTO: equipamentos com risco alto / críticos / mais vulneráveis
- BACKLOG: manutenções pendentes / em aberto / não concluídas
- DESCONHECIDO: pergunta não identificada

Para "periodo": calcule datas reais com base em hoje (${new Date().toISOString()}). Se não mencionado, use null.
Para "tipoManutencao": "Preventiva" | "Corretiva" | null (null = todos).
Para "limite": quantos resultados mostrar (padrão 5).

Mensagem: "${mensagem}"`;

  try {
    const resposta = await generateTextWithLlm(prompt);
    const parsed = parsearJson(resposta);
    return parsed || { tipo: 'DESCONHECIDO', periodo: null, tipoManutencao: null, limite: 5 };
  } catch {
    return { tipo: 'DESCONHECIDO', periodo: null, tipoManutencao: null, limite: 5 };
  }
}

async function topEquipamentos({ tenantId, tipoManutencao, periodo, limite }) {
  const periodoWhere = periodoParaWhere(periodo || periodoUltimoAno());

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...periodoWhere,
    },
    select: {
      equipamentoId: true,
      equipamento: { select: { modelo: true, tag: true, tipo: true } },
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
        tipo: m.equipamento?.tipo || '-',
        total: 0,
      };
    }
    contagem[id].total++;
  }

  return Object.values(contagem)
    .sort((a, b) => b.total - a.total)
    .slice(0, limite || 5);
}

async function porSetor({ tenantId, tipoManutencao, periodo }) {
  const periodoWhere = periodoParaWhere(periodo || periodoUltimoAno());

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...periodoWhere,
    },
    select: {
      equipamento: { select: { setor: true } },
    },
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
  const periodoWhere = periodoParaWhere(periodo || periodoUltimoAno());

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...periodoWhere,
    },
    select: {
      equipamento: {
        select: { unidade: { select: { nomeSistema: true } } },
      },
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
  const periodoWhere = periodoParaWhere(periodo || periodoUltimoAno());

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      ...(tipoManutencao && { tipo: tipoManutencao }),
      ...periodoWhere,
      dataHoraAgendamentoInicio: { not: null },
    },
    select: { dataHoraAgendamentoInicio: true },
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
      modelo: true,
      tag: true,
      tipo: true,
      riskScore: true,
      setor: true,
      unidade: { select: { nomeSistema: true } },
    },
    orderBy: { riskScore: 'desc' },
    take: limite || 10,
  });
}

async function backlog({ tenantId }) {
  const pendentes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      status: { in: ['Agendada', 'EmProgresso'] },
    },
    select: {
      numeroOS: true,
      tipo: true,
      status: true,
      dataHoraAgendamentoInicio: true,
      equipamento: {
        select: {
          modelo: true,
          unidade: { select: { nomeSistema: true } },
        },
      },
    },
    orderBy: { dataHoraAgendamentoInicio: 'asc' },
    take: 20,
  });

  return pendentes;
}

function formatarTopEquipamentos(dados) {
  if (!dados.length) return 'Não encontrei manutenções no período.';
  const linhas = dados.map(
    (e, i) => `${i + 1}. **${e.modelo}** (TAG: ${e.tag}) — ${e.total} manutenção(ões)`
  );
  return `**Top equipamentos por manutenções:**\n${linhas.join('\n')}`;
}

function formatarPorSetor(dados) {
  if (!dados.length) return 'Não encontrei dados por setor.';
  const linhas = dados.map((s) => `- **${s.setor}**: ${s.total}`);
  return `**Manutenções por setor:**\n${linhas.join('\n')}`;
}

function formatarPorUnidade(dados) {
  if (!dados.length) return 'Não encontrei dados por unidade.';
  const linhas = dados.map((u) => `- **${u.unidade}**: ${u.total}`);
  return `**Manutenções por unidade:**\n${linhas.join('\n')}`;
}

function formatarTendencia(dados) {
  if (!dados.length) return 'Não encontrei dados de tendência.';
  const linhas = dados.map((m) => `- ${m.mes}: ${m.total}`);
  return `**Tendência mensal de manutenções:**\n${linhas.join('\n')}`;
}

function formatarRiscoAlto(dados) {
  if (!dados.length) return 'Nenhum equipamento com risco alto encontrado.';
  const linhas = dados.map(
    (e) =>
      `- **${e.modelo}** (${e.unidade?.nomeSistema || '-'} / ${e.setor || '-'}) — Score: ${e.riskScore ?? 'N/A'}`
  );
  return `**Equipamentos com risco alto:**\n${linhas.join('\n')}`;
}

function formatarBacklog(dados) {
  if (!dados.length) return 'Sem manutenções pendentes no momento.';
  const linhas = dados.map(
    (m) =>
      `- OS **${m.numeroOS}** | ${m.tipo} | ${m.status} | ${m.equipamento?.modelo || '-'} (${m.equipamento?.unidade?.nomeSistema || '-'})`
  );
  return `**Backlog de manutenções (${dados.length}):**\n${linhas.join('\n')}`;
}

export const AnalyticsService = {
  async processar(mensagem, contextoUsuario) {
    const { tenantId } = contextoUsuario;

    console.log(`[ANALYTICS] Processando consulta analítica para tenant: ${tenantId}`);

    const consulta = await classificarConsulta(mensagem);

    console.log(`[ANALYTICS] Tipo detectado: ${consulta.tipo}`);

    try {
      let texto;

      switch (consulta.tipo) {
        case 'TOP_EQUIPAMENTOS': {
          const dados = await topEquipamentos({
            tenantId,
            tipoManutencao: consulta.tipoManutencao,
            periodo: consulta.periodo,
            limite: consulta.limite,
          });
          texto = formatarTopEquipamentos(dados);
          break;
        }
        case 'POR_SETOR': {
          const dados = await porSetor({
            tenantId,
            tipoManutencao: consulta.tipoManutencao,
            periodo: consulta.periodo,
          });
          texto = formatarPorSetor(dados);
          break;
        }
        case 'POR_UNIDADE': {
          const dados = await porUnidade({
            tenantId,
            tipoManutencao: consulta.tipoManutencao,
            periodo: consulta.periodo,
          });
          texto = formatarPorUnidade(dados);
          break;
        }
        case 'TENDENCIA_MENSAL': {
          const dados = await tendenciaMensal({
            tenantId,
            tipoManutencao: consulta.tipoManutencao,
            periodo: consulta.periodo,
          });
          texto = formatarTendencia(dados);
          break;
        }
        case 'RISCO_ALTO': {
          const dados = await riscoAlto({ tenantId, limite: consulta.limite });
          texto = formatarRiscoAlto(dados);
          break;
        }
        case 'BACKLOG': {
          const dados = await backlog({ tenantId });
          texto = formatarBacklog(dados);
          break;
        }
        default:
          texto =
            'Não consegui identificar o tipo de análise. Tente perguntas como: "quais equipamentos tiveram mais paradas?", "como estão as manutenções por setor?", "qual a tendência mensal?".';
      }

      return { mensagem: texto };
    } catch (err) {
      console.error('[ANALYTICS_ERROR]', err.message);
      return { mensagem: 'Tive um problema ao executar a análise. Poderia reformular a pergunta?' };
    }
  },
};
