// Fallback conversacional do agent T.H.I.A.G.O. usando LLM (gpt-4.1-mini).
//
// Acionado quando InterpretationAgent classifica a mensagem como OUTRO —
// perguntas exploratorias ('em que pode me ajudar?', 'que tipo de
// analises?'), saudacoes, esclarecimentos. Em vez de devolver mensagem
// hardcoded, chama LLM com:
//   - System prompt descrevendo a identidade e capacidades concretas
//   - Historico recente da sessao (continuidade conversacional)
//   - Mensagem do usuario
//
// Resposta inclui sugestoes de acao clicaveis (meta.suggestions) para
// conduzir o usuario para uma tarefa concreta.

import { generateJsonWithLlm, getLlmRuntimeInfo } from '../../ai/llmService.js';
import { logAgentError, logAgentStage } from '../core/agentLogger.js';

// Sugestoes-padrao quando o LLM nao retornar nada relevante.
const SUGESTOES_DEFAULT = [
  'Quando foi a última corretiva do RM da Sede?',
  'PDF das preventivas dos últimos 6 meses',
  'Equipamentos com mais paradas',
];

// Prompt usado quando a mensagem do usuario foi classificada como AMBIGUA
// (verbo de acao detectado mas tipo nao identificado). Exemplo classico:
// "gostaria de abrir um chamado" pode ser ocorrencia, OS corretiva ou
// agendamento de preventiva.
function montarSystemPromptAmbiguo() {
  return `Você é T.H.I.A.G.O., assistente do SIMEC. O usuário disse algo que indica que QUER iniciar uma ação, mas não foi específico sobre o tipo. Sua tarefa é DESAMBIGUAR — listar as opções e perguntar.

CONTEXTO DAS OPÇÕES NO SIMEC:
Quando alguém fala "abrir chamado", "novo chamado", "registrar problema", pode ser uma de 3 coisas:

1. REGISTRAR OCORRÊNCIA — incidente espontâneo que aconteceu (equipamento parou, deu erro, comportamento estranho). Útil para ter histórico mesmo sem precisar de visita técnica imediata.

2. ABRIR OS CORRETIVA — quando o equipamento parou/falhou e precisa de visita técnica para consertar. Vira uma Ordem de Serviço corretiva.

3. AGENDAR PREVENTIVA — manutenção planejada (revisão programada, calibração, inspeção). Não é por causa de falha — é prevenção.

TOM: direto, técnico, sem excesso de cortesia. Pergunta curta e clara.

FORMATO (JSON estrito):
{
  "mensagem": "string — explica brevemente as 3 opções e pergunta qual",
  "sugestoes": ["Registrar ocorrência", "Abrir OS corretiva", "Agendar preventiva"]
}

EXEMPLO de resposta para "gostaria de abrir um chamado":
{
  "mensagem": "Posso te ajudar. Qual o tipo de chamado?\\n\\n• **Registrar ocorrência** — algo aconteceu e quero registrar (sem visita técnica imediata)\\n• **Abrir OS corretiva** — equipamento parou/falhou e precisa de técnico\\n• **Agendar preventiva** — manutenção planejada (revisão, calibração)\\n\\nQual deles?",
  "sugestoes": ["Registrar ocorrência", "Abrir OS corretiva", "Agendar preventiva"]
}`;
}

function montarSystemPrompt() {
  return `Você é T.H.I.A.G.O., assistente do SIMEC — sistema de gestão de equipamentos médico-hospitalares (EAM clínico) da Cerdil.

IDENTIDADE:
- Tom: direto e técnico. Sem floreios, sem excesso de cortesia.
- Linguagem: pt-BR objetivo, frases curtas. Máximo ~3 parágrafos por resposta.
- Você ajuda engenheiros clínicos, supervisores e gestores. Use vocabulário técnico (preventiva, corretiva, modalidade, conformidade ANVISA, etc.) sem explicar termos básicos.

O QUE VOCÊ SABE FAZER (ações concretas):
1. CONSULTAS: "Quando foi a última corretiva do RM 3T?", "Quais OS preventivas no TC MTZ no último ano?"
2. RELATÓRIOS PDF: "PDF das preventivas dos últimos 6 meses do mamógrafo", "Conformidade ANVISA da Cerdil Sede"
3. AGENDAMENTOS: "Agendar preventiva da TC Sede para terça"
4. ANÁLISES: equipamentos com mais paradas, distribuição por unidade, MTBF, ranking, evolução mensal
5. SEGUROS: vencimento de apólice, cobertura, PDF do seguro
6. AÇÕES EM LOTE: "Abrir OS para todos equipamentos vencidos da Cerdil"

LIMITES (transparente quando relevante):
- PDFs: até 50 itens por relatório, período padrão 12 meses (máx 36 meses)
- Você NÃO altera dados — apenas consulta, sugere ações e gera documentos.
- Você NÃO faz análise médica/diagnóstica — só técnica de equipamento.

QUANDO RESPONDER:
- Se o usuário pergunta capacidade ("o que faz?", "exemplos", "ajuda"): liste 3-4 ações concretas com exemplos REAIS de equipamentos da Cerdil quando souber (RM 3T, TC Sede, Mamografia Best, etc.)
- Se o usuário faz pergunta tangencial mas relacionada: responda direto + sugira o pedido completo formatado.
- Se foge do escopo (clima, política, geral): responda curto que não é sua especialidade e redirecione ("Posso ajudar com algo do SIMEC?").

FORMATO DA RESPOSTA (JSON estrito):
{
  "mensagem": "string — sua resposta natural ao usuário, em pt-BR direto",
  "sugestoes": ["string", "string", "string"]
}

"sugestoes" deve ter 2-4 frases curtas (máx 60 chars cada) que o usuário pode clicar para enviar como nova mensagem. Sempre relevantes ao contexto. Use exemplos concretos do SIMEC ("Última corretiva do RM 3T", "PDF preventivas TC Sede", etc).
NUNCA inclua explicações fora da mensagem. NUNCA invente dados (não diga "RM 3T tem 5 OS no último mês" — você não consultou).`;
}

function sanitizar(s) {
  return String(s || '').slice(0, 1000);
}

// Monta historico recente em texto plano para o LLM ter continuidade.
// Limita a ~6 turnos (12 mensagens) para nao estourar contexto.
function montarHistoricoPrompt(historico = []) {
  if (!Array.isArray(historico) || historico.length === 0) return '';
  const ultimos = historico.slice(-12);
  const linhas = ultimos
    .map((m) => {
      const role = m.role === 'user' ? 'Usuário' : 'T.H.I.A.G.O.';
      const text = sanitizar(m.content || m.mensagem || '').slice(0, 300);
      return `${role}: ${text}`;
    })
    .join('\n');
  return `\n\nHISTÓRICO RECENTE DA CONVERSA:\n${linhas}\n`;
}

/**
 * Responde de forma conversacional usando LLM.
 *
 * @param {object} params
 * @param {string} params.mensagem — mensagem do usuario
 * @param {Array}  params.historico — mensagens anteriores [{ role, content }]
 * @param {object} params.contextoUsuario — { tenantId, usuarioNome }
 * @param {object} params.logContext
 * @returns {Promise<{ mensagem: string, meta: { suggestions: string[] } }>}
 */
export async function responderConversacional({
  mensagem,
  historico = [],
  contextoUsuario = {},
  logContext = {},
  intent = 'OUTRO',
} = {}) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) {
    return intent === 'AMBIGUO' ? fallbackAmbiguo() : fallbackSemLlm();
  }

  // Quando intent foi marcado como AMBIGUO (verbo de acao sem tipo claro),
  // usa um prompt especifico de desambiguacao em vez do conversacional geral.
  const systemPrompt = intent === 'AMBIGUO'
    ? montarSystemPromptAmbiguo()
    : montarSystemPrompt();
  const historicoPrompt = montarHistoricoPrompt(historico);
  const userPrompt = `\nMENSAGEM ATUAL DO USUÁRIO: "${sanitizar(mensagem)}"`;

  const prompt = `${systemPrompt}${historicoPrompt}${userPrompt}\n\nResponda APENAS com JSON válido conforme o schema definido.`;

  try {
    const resposta = await generateJsonWithLlm(prompt, {
      feature: 'agente_conversa',
      tenantId: contextoUsuario.tenantId,
    });

    const mensagemFinal = String(resposta?.mensagem || '').trim();
    if (!mensagemFinal) return fallbackSemLlm(mensagem);

    const sugestoes = Array.isArray(resposta?.sugestoes)
      ? resposta.sugestoes
          .map((s) => String(s || '').trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];

    logAgentStage('CONVERSACAO_RESPONSE', logContext, {
      tamanhoResposta: mensagemFinal.length,
      qtdSugestoes: sugestoes.length,
    });

    return {
      mensagem: mensagemFinal,
      meta: {
        intent: 'CONVERSACAO',
        suggestions: sugestoes.length ? sugestoes : SUGESTOES_DEFAULT,
      },
    };
  } catch (error) {
    logAgentError('CONVERSACAO_ERROR', error, logContext, { mensagem });
    return fallbackSemLlm(mensagem);
  }
}

// Resposta minimamente util quando o LLM nao esta disponivel ou falha.
function fallbackSemLlm() {
  return {
    mensagem:
      'Posso buscar dados da sua base de equipamentos e gerar relatórios. Por exemplo: histórico de manutenções, conformidade ANVISA, análises de paradas, agendamentos. O que você precisa?',
    meta: {
      intent: 'CONVERSACAO',
      suggestions: SUGESTOES_DEFAULT,
    },
  };
}

// Fallback de desambiguacao quando o LLM nao esta disponivel e a mensagem
// foi marcada como AMBIGUA pelo InterpretationAgent.
function fallbackAmbiguo() {
  return {
    mensagem:
      'Posso te ajudar. Qual o tipo de chamado?\n\n' +
      '• **Registrar ocorrência** — algo aconteceu e quero registrar (sem visita técnica imediata)\n' +
      '• **Abrir OS corretiva** — equipamento parou/falhou e precisa de técnico\n' +
      '• **Agendar preventiva** — manutenção planejada (revisão, calibração)\n\n' +
      'Qual deles?',
    meta: {
      intent: 'AMBIGUO',
      suggestions: ['Registrar ocorrência', 'Abrir OS corretiva', 'Agendar preventiva'],
    },
  };
}
