import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgendamentoSchema } from './schema.js';
import {
  normalizarObjetoIA,
  mesclarPreferindoIAComFallback,
} from './normalizers.js';
import {
  extrairCamposHeuristico,
  mensagemEhConfirmacaoCurta,
} from './heuristicaExtractor.js';
import { extrairDataUTC } from '../../../timeService.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const extrairCamposComIA = async (mensagem, estado) => {
  const dataHoje = extrairDataUTC();
  const fallback = extrairCamposHeuristico(mensagem, estado);

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

  const prompt = `
DATA_HOJE: ${dataHoje}
ESTADO_ATUAL: ${JSON.stringify(estado)}
MENSAGEM: "${mensagem}"

TAREFA:
Extraia os dados do agendamento para este JSON:
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

REGRAS:
1. Se disser "Tomografia de Coxim", extraia "Tomografia" em equipamentoTexto e "Coxim" em unidadeTexto.
2. "tipoManutencao" deve ser apenas "Corretiva" ou "Preventiva".
3. "horaInicio/horaFim" em HH:mm.
4. Se disser "hoje", use ${dataHoje}.
5. "confirmacao": true para sim/confirmar, false para não/cancelar, null caso contrário.
6. Retorne APENAS JSON puro.
`;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const result = await model.generateContent(prompt);
      const texto = result.response.text();
      const match = texto.match(/{[\s\S]*}/);

      if (!match) {
        throw new Error('JSON não encontrado na resposta da IA');
      }

      const bruto = JSON.parse(match[0]);
      const normalizadoIA = normalizarObjetoIA(bruto);
      const finalObj = mesclarPreferindoIAComFallback(
        normalizadoIA,
        fallback
      );

      return AgendamentoSchema.parse(finalObj);
    } catch (e) {
      console.error(
        `[AGENT_EXTRACT_ERROR][tentativa ${tentativa}]:`,
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