// simec/backend-simec/services/agent/intentClassifier.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicialização com a chave de API limpa
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
// FIXO: Versão 2.5 mantida conforme exigência do ambiente
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

/**
 * Classifica a intenção real do usuário, ignorando saudações e focando no objetivo da mensagem.
 */
export async function classificarIntencao(mensagem) {
    const prompt = `
    Você é um triador especializado para um sistema de engenharia clínica hospitalar. 
    Identifique o OBJETIVO FINAL da mensagem, ignorando cortesias e saudações iniciais.

    CATEGORIAS VÁLIDAS:
    - AGENDAR_MANUTENCAO: Para pedidos de agendamento, conserto, reparo, preventivas ou corretivas. 
      Exemplo: "Olá, vamos marcar uma corretiva...", "Agende um reparo...", "Quebrou o raio-x".
    - RELATORIO: Para pedidos de listas, visualização de histórico ou geração de documentos PDF.
    - BUSCAR_APOLICE: Para dúvidas ou consultas sobre seguros e apólices.
    - OUTRO: Saudações puras (Oi, Olá), agradecimentos ou assuntos sem pedido de ação.

    MENSAGEM DO USUÁRIO: "${mensagem}"

    REGRA: Responda APENAS o nome da categoria em MAIÚSCULAS. Sem explicações ou pontuação extra.
    `;

    try {
        const result = await model.generateContent(prompt);
        let respostaIA = result.response.text().trim().toUpperCase();
        
        // Limpeza de Markdown caso a IA retorne o texto dentro de blocos de código
        respostaIA = respostaIA.replace(/```|JSON/g, "").trim();

        // Mapeamento de segurança para garantir compatibilidade com as chaves do router.js
        const categoriasValidas = ['AGENDAR_MANUTENCAO', 'RELATORIO', 'BUSCAR_APOLICE', 'OUTRO'];
        
        // Busca se a resposta da IA contém alguma das categorias permitidas
        const detectada = categoriasValidas.find(cat => respostaIA.includes(cat));

        // LOG DE MONITORAMENTO: Essencial para depurar o comportamento no Railway
        console.log(`[IA_INTENT] Input: "${mensagem}" | Detectada: ${detectada || 'OUTRO'}`);

        return detectada || 'OUTRO'; 

    } catch (error) {
        // Captura falhas de conexão ou erros da API do Google
        console.error("[IA_INTENT_ERROR]:", error.message);
        return "OUTRO"; // Fallback seguro para o fluxo continuar na saudação
    }
}