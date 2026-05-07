import { generateTextWithLlm, getLlmRuntimeInfo } from '../../../ai/llmService.js';
import { extrairDataUTC } from '../../../time/index.js';

const CONFIRMACAO_POSITIVA = ['sim', 'confirmar', 'confirma', 'ok', 'pode', 'pode sim', 'isso', 'correto', 'certo'];
const CONFIRMACAO_NEGATIVA = ['não', 'nao', 'cancelar', 'cancela', 'parar', 'negativo', 'errado'];

export function extrairConfirmacao(msg) {
  const m = msg.toLowerCase().trim();
  if (CONFIRMACAO_POSITIVA.includes(m)) return true;
  if (CONFIRMACAO_NEGATIVA.some((t) => m.startsWith(t))) return false;
  return null;
}

export function extrairOsIndex(msg) {
  const m = msg.toLowerCase().trim();
  if (/^(1|primeira|primeiro|a primeira|o primeiro|a 1|o 1|número 1|numero 1)$/.test(m)) return 1;
  if (/^(2|segunda|segundo|a segunda|o segundo|a 2|o 2|número 2|numero 2)$/.test(m)) return 2;
  if (/^(3|terceira|terceiro|a terceira|o terceiro|a 3|o 3)$/.test(m)) return 3;
  const match = m.match(/^(\d+)$/);
  if (match) return parseInt(match[1], 10);
  return null;
}

export function inferirStatusEquipamento(descricao) {
  if (!descricao) return null;
  const d = descricao.toLowerCase();
  if (/parou|não funciona|nao funciona|inoperante|não liga|nao liga|desligou|apagou|travou|quebrou|falhou|sem funcionar|fora de uso|parado/.test(d)) {
    return 'Inoperante';
  }
  if (/parcialmente|parcial|limitado|às vezes|as vezes|intermitente|com dificuldade|reduzido|restrito|uso limitado/.test(d)) {
    return 'UsoLimitado';
  }
  if (/revisão|revisao|em manutenção|em manutencao|parado para|aguardando|preventiva/.test(d)) {
    return 'EmManutencao';
  }
  return null;
}

function parsearJsonBruto(texto) {
  try {
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function extrairCamposOsCorretiva(mensagem, estado = {}) {
  const dataHoje = extrairDataUTC();
  const confirmacao = extrairConfirmacao(mensagem);
  const osIndex = extrairOsIndex(mensagem);

  const llm = getLlmRuntimeInfo();

  if (!llm.available) {
    return {
      equipamentoTexto: null,
      unidadeTexto: null,
      descricaoProblema: null,
      statusEquipamentoAbertura: null,
      prestadorNome: null,
      data: null,
      horaInicio: null,
      horaFim: null,
      confirmacao,
      osIndex,
      novaOcorrencia: null,
    };
  }

  const prompt = `DATA_HOJE: ${dataHoje}
ESTADO_ATUAL: ${JSON.stringify(estado)}
MENSAGEM: "${mensagem}"

TAREFA:
Você é um extrator de dados para OS Corretiva hospitalar. Analise a MENSAGEM e retorne APENAS o JSON abaixo com os campos identificados.

{
  "equipamentoTexto": null,
  "unidadeTexto": null,
  "descricaoProblema": null,
  "statusEquipamentoAbertura": null,
  "prestadorNome": null,
  "data": null,
  "horaInicio": null,
  "horaFim": null,
  "novaOcorrencia": null
}

REGRAS:
1. equipamentoTexto: nome/modelo/tipo do equipamento. "TC" = Tomógrafo Computadorizado.
2. unidadeTexto: nome da unidade/hospital/filial. "Cassems de Campo Grande" → "Cassems Campo Grande".
3. descricaoProblema: descrição do problema em linguagem natural. Extraia do contexto da mensagem.
4. statusEquipamentoAbertura: infira da descrição. Valores válidos:
   - "Inoperante": parou, não funciona, não liga, desligou, quebrou
   - "UsoLimitado": funcionando parcialmente, com limitação, às vezes, intermitente
   - "EmManutencao": em revisão, aguardando, parado para verificação
   - null: se não conseguir inferir
5. prestadorNome: nome da empresa/prestador que vai realizar a visita. Ex: "Siemens", "Philips Service".
6. data: YYYY-MM-DD. "hoje" → ${dataHoje}. "amanhã" → calcule ${dataHoje} + 1 dia. "dia 20/08/2026" → "2026-08-20".
7. horaInicio / horaFim: HH:mm. "15h" → "15:00". "8h30" → "08:30".
8. novaOcorrencia: true se o usuário quer abrir uma nova ocorrência (palavras: "nova", "novo problema", "diferente", "outro defeito"). false se quer agendar visita para OS existente. null se não está claro.
9. Campos não mencionados → null. Nunca invente.`;

  try {
    const texto = await generateTextWithLlm(prompt);
    const bruto = parsearJsonBruto(texto);
    if (!bruto) return { equipamentoTexto: null, unidadeTexto: null, descricaoProblema: null, statusEquipamentoAbertura: null, prestadorNome: null, data: null, horaInicio: null, horaFim: null, confirmacao, osIndex, novaOcorrencia: null };

    const statusInferido = bruto.statusEquipamentoAbertura || inferirStatusEquipamento(bruto.descricaoProblema || estado.descricaoProblema);

    return {
      equipamentoTexto: bruto.equipamentoTexto || null,
      unidadeTexto: bruto.unidadeTexto || null,
      descricaoProblema: bruto.descricaoProblema || null,
      statusEquipamentoAbertura: statusInferido || null,
      prestadorNome: bruto.prestadorNome || null,
      data: bruto.data || null,
      horaInicio: bruto.horaInicio || null,
      horaFim: bruto.horaFim || null,
      confirmacao,
      osIndex,
      novaOcorrencia: bruto.novaOcorrencia ?? null,
    };
  } catch (err) {
    console.error('[OS_CORRETIVA_EXTRACTOR] Erro:', err.message);
    return { equipamentoTexto: null, unidadeTexto: null, descricaoProblema: null, statusEquipamentoAbertura: inferirStatusEquipamento(estado.descricaoProblema), prestadorNome: null, data: null, horaInicio: null, horaFim: null, confirmacao, osIndex, novaOcorrencia: null };
  }
}
