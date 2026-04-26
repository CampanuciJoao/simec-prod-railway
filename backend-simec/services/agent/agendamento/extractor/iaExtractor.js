import { AgendamentoSchema } from './schema.js';
import {
  normalizarObjetoIA,
  mesclarPreferindoIAComFallback,
} from './normalizers.js';
import {
  extrairCamposHeuristico,
  mensagemEhConfirmacaoCurta,
} from './heuristicaExtractor.js';
import { extrairDataUTC } from '../../../time/index.js';
import {
  generateTextWithLlm,
  getLlmRuntimeInfo,
} from '../../../ai/llmService.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const extrairCamposComIA = async (mensagem, estado) => {
  const dataHoje = extrairDataUTC();
  const fallback = extrairCamposHeuristico(mensagem, estado);
  const llm = getLlmRuntimeInfo();

  if (mensagemEhConfirmacaoCurta(mensagem)) {
    return AgendamentoSchema.parse({
      tipoManutencao: null,
      unidadeTexto: null,
      equipamentoTexto: null,
      data: null,
      horaInicio: null,
      horaFim: null,
      numeroChamado: null,
      descricao: null,
      confirmacao: fallback.confirmacao,
    });
  }

  if (!llm.available) {
    return fallback;
  }

  // FIX: o prompt instrui o LLM a normalizar internamente — nunca exigir formato
  // do usuário nem devolver mensagens de erro de formato na extração.
  const prompt = `
DATA_HOJE: ${dataHoje}
ESTADO_ATUAL: ${JSON.stringify(estado)}
MENSAGEM: "${mensagem}"

TAREFA:
Você é um extrator de dados de agendamento. Analise a MENSAGEM e preencha o JSON abaixo com os campos que conseguir identificar. Retorne APENAS o JSON puro, sem explicações.

{
  "tipoManutencao": null,
  "unidadeTexto": null,
  "equipamentoTexto": null,
  "data": null,
  "horaInicio": null,
  "horaFim": null,
  "numeroChamado": null,
  "descricao": null,
  "confirmacao": null
}

REGRAS DE EXTRAÇÃO:
1. Se disser "Tomografia de Coxim", extraia "Tomografia" em equipamentoTexto e "Coxim" em unidadeTexto.
2. "tipoManutencao" deve ser "Corretiva" ou "Preventiva". Null se não mencionado.
3. NORMALIZAÇÃO DE HORÁRIO (faça você mesmo, nunca peça formato ao usuário):
   - "10h", "10:00h", "às 10", "as 10", "10 da manhã" → "10:00"
   - "8:30h", "8h30" → "08:30"
   - Resultado sempre em formato HH:mm (ex: "09:00", "14:30")
   - Se não conseguir identificar, retorne null (nunca retorne erro de formato)
4. NORMALIZAÇÃO DE DATA (faça você mesmo):
   - "hoje" → ${dataHoje}
   - "amanhã" → calcule ${dataHoje} + 1 dia
   - "21/04/2026" ou "21-04-2026" → "2026-04-21"
   - "dia 21" → dia 21 do mês corrente ou próximo
   - Resultado sempre em formato YYYY-MM-DD
5. "confirmacao": true para sim/confirmar/ok, false para nao/cancelar, null caso contrário.
6. Campos não mencionados → null. Nunca invente dados.
`;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const texto = await generateTextWithLlm(prompt);
      const match = texto.match(/\{[\s\S]*\}/);

      if (!match) {
        throw new Error('JSON nao encontrado na resposta da IA');
      }

      const bruto = JSON.parse(match[0]);
      const normalizadoIA = normalizarObjetoIA(bruto);
      const finalObj = mesclarPreferindoIAComFallback(normalizadoIA, fallback);

      return AgendamentoSchema.parse(finalObj);
    } catch (e) {
      console.error(
        `[AGENT_EXTRACT_ERROR][provider ${llm.activeProvider}][tentativa ${tentativa}]:`,
        e.message
      );

      const erroTexto = String(e.message || '');
      const eh503 =
        erroTexto.includes('503') || erroTexto.includes('high demand');

      if (tentativa < 2 && eh503) {
        await sleep(700);
        continue;
      }
    }
  }

  return fallback;
};
