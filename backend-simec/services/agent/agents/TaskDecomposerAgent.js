import prisma from '../../prismaService.js';
import { generateTextWithLlm, getLlmRuntimeInfo } from '../../ai/llmService.js';
import { adicionarAuditoria } from '../orchestrator/AgentContext.js';

const FILTROS_VALIDOS = ['VENCIDOS', 'SEM_MANUTENCAO', 'RISCO_ALTO', 'POR_SETOR', 'POR_UNIDADE'];

async function classificarFiltroLote(mensagem) {
  const llm = getLlmRuntimeInfo();

  if (!llm.available) {
    return { filtro: 'VENCIDOS', setor: null, unidade: null, tipoManutencao: null, data: null, horaInicio: null, horaFim: null };
  }

  const prompt = `Analise a mensagem abaixo e retorne APENAS um JSON com esta estrutura exata:

{
  "filtro": "VENCIDOS",
  "setor": null,
  "unidade": null,
  "tipoManutencao": "Preventiva",
  "data": null,
  "horaInicio": null,
  "horaFim": null
}

Valores possíveis para "filtro":
- "VENCIDOS": equipamentos com OS agendadas em atraso
- "SEM_MANUTENCAO": equipamentos sem manutenção nos últimos 90 dias
- "RISCO_ALTO": equipamentos com nível de risco alto / críticos
- "POR_SETOR": todos os equipamentos de um setor específico (extrair "setor")
- "POR_UNIDADE": todos os equipamentos de uma unidade/hospital (extrair "unidade")

"tipoManutencao": "Preventiva" | "Corretiva" | null
"data": formato DD/MM/AAAA, ou null se não mencionado
"horaInicio" / "horaFim": formato HH:mm, ou null

Mensagem: "${mensagem}"`;

  try {
    const resposta = await generateTextWithLlm(prompt);
    const match = resposta.match(/\{[\s\S]*\}/);
    if (!match) return { filtro: 'VENCIDOS', setor: null, unidade: null, tipoManutencao: null, data: null, horaInicio: null, horaFim: null };
    const parsed = JSON.parse(match[0]);
    if (!FILTROS_VALIDOS.includes(parsed.filtro)) parsed.filtro = 'VENCIDOS';
    return parsed;
  } catch {
    return { filtro: 'VENCIDOS', setor: null, unidade: null, tipoManutencao: null, data: null, horaInicio: null, horaFim: null };
  }
}

const BASE_SELECT = {
  id: true,
  modelo: true,
  tag: true,
  tipo: true,
  setor: true,
  riskScore: true,
  unidade: { select: { id: true, nomeSistema: true } },
};

async function buscarEquipamentosLote(tenantId, { filtro, setor, unidade }) {
  switch (filtro) {
    case 'VENCIDOS': {
      const manutencoes = await prisma.manutencao.findMany({
        where: {
          tenantId,
          status: 'Agendada',
          dataHoraAgendamentoInicio: { lt: new Date() },
        },
        select: { equipamentoId: true, equipamento: { select: BASE_SELECT } },
        orderBy: { dataHoraAgendamentoInicio: 'asc' },
        take: 20,
      });
      const vistos = new Set();
      return manutencoes
        .filter((m) => m.equipamentoId && !vistos.has(m.equipamentoId) && vistos.add(m.equipamentoId))
        .map((m) => m.equipamento)
        .filter(Boolean);
    }

    case 'SEM_MANUTENCAO':
      return prisma.equipamento.findMany({
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
        select: BASE_SELECT,
        take: 20,
      });

    case 'RISCO_ALTO':
      return prisma.equipamento.findMany({
        where: { tenantId, riskLevel: 'Alto' },
        select: BASE_SELECT,
        orderBy: { riskScore: 'desc' },
        take: 20,
      });

    case 'POR_SETOR': {
      if (!setor) return [];
      return prisma.equipamento.findMany({
        where: { tenantId, setor: { contains: setor, mode: 'insensitive' } },
        select: BASE_SELECT,
        take: 20,
      });
    }

    case 'POR_UNIDADE': {
      if (!unidade) return [];
      const unidadeDb = await prisma.unidade.findFirst({
        where: { tenantId, nomeSistema: { contains: unidade, mode: 'insensitive' } },
        select: { id: true },
      });
      if (!unidadeDb) return [];
      return prisma.equipamento.findMany({
        where: { tenantId, unidadeId: unidadeDb.id },
        select: BASE_SELECT,
        take: 20,
      });
    }

    default:
      return [];
  }
}

export const TaskDecomposerAgent = {
  nome: 'TaskDecomposerAgent',
  capacidades: ['decompor_batch', 'filtrar_equipamentos_lote'],

  async executar(contexto) {
    if (contexto.interpretacao?.intent !== 'BATCH_AGENDAMENTO') return;

    const { tenantId, mensagem } = contexto;

    try {
      const parametros = await classificarFiltroLote(mensagem);
      const equipamentos = await buscarEquipamentosLote(tenantId, parametros);

      contexto.subtarefas = {
        equipamentos,
        total: equipamentos.length,
        filtro: parametros.filtro,
        setor: parametros.setor || null,
        unidade: parametros.unidade || null,
        tipoManutencao: parametros.tipoManutencao || null,
        data: parametros.data || null,
        horaInicio: parametros.horaInicio || null,
        horaFim: parametros.horaFim || null,
      };

      adicionarAuditoria(contexto, {
        agente: 'TaskDecomposerAgent',
        filtro: parametros.filtro,
        totalEquipamentos: equipamentos.length,
      });

      console.log(`[TASK_DECOMPOSER] Filtro: ${parametros.filtro} | Equipamentos encontrados: ${equipamentos.length}`);
    } catch (err) {
      console.error('[TASK_DECOMPOSER] Erro:', err.message);
      contexto.subtarefas = { equipamentos: [], total: 0, filtro: null };
    }
  },
};
