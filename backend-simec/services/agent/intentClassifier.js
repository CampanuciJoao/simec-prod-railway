// simec/backend-simec/services/agent/intentClassifier.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Classifica a intenção do usuário para que o roteador saiba qual "Especialista" chamar.
 */
export async function classificarIntencao(mensagem) {
    const prompt = `
    Analise a mensagem do usuário: "${mensagem}"
    Classifique a intenção em apenas uma das categorias: AGENDAR_MANUTENCAO, RELATORIO, BUSCAR_APOLICE, OUTRO.
    Retorne APENAS o nome da categoria em MAIÚSCULAS, sem pontuação, sem explicação.
    `;

    try {
        const result = await model.generateContent(prompt);
        let texto = result.response.text().trim().toUpperCase();
        
        // Limpeza profissional: garante que, se a IA retornar "CATEGORIA: AGENDAR_MANUTENCAO",
        // nós pegamos apenas a palavra chave.
        const categorias = ['AGENDAR_MANUTENCAO', 'RELATORIO', 'BUSCAR_APOLICE', 'OUTRO'];
        const encontrada = categorias.find(cat => texto.includes(cat));

        return encontrada || 'OUTRO'; 
    } catch (error) {
        console.error("Erro na classificação de intenção:", error);
        return "OUTRO"; // Fallback seguro para não travar o sistema
    }
}