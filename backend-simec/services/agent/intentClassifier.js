// simec/backend-simec/services/agent/intentClassifier.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Classifica a intenção real do usuário, ignorando saudações e focando em palavras-chave de ação.
 */
export async function classificarIntencao(mensagem) {
    const prompt = `
    Você é um triador inteligente de um sistema hospitalar. 
    Sua tarefa é identificar a TAREFA que o usuário quer realizar, ignorando saudações ou conversas irrelevantes.

    Categorias e Palavras-Chave:
    1. AGENDAR_MANUTENCAO: agendar, marcar, consertar, quebrou, parou de funcionar, preventiva, corretiva, abrir OS, manutenção.
    2. RELATORIO: ver lista, gerar PDF, exportar, histórico de gastos, relatório de equipamentos.
    3. BUSCAR_APOLICE: seguro, apólice, vigência, vencimento do seguro, renovação.
    4. OUTRO: apenas oi, bom dia, como você está, ou assuntos não relacionados ao sistema.

    MENSAGEM DO USUÁRIO: "${mensagem}"

    Regra: Se a frase contiver uma saudação E um pedido (ex: "Oi, quero agendar..."), ignore o "Oi" e responda a categoria do pedido.
    Responda APENAS o nome da categoria em MAIÚSCULAS.
    `;

    try {
        const result = await model.generateContent(prompt);
        let texto = result.response.text().trim().toUpperCase();
        
        // Mapeamento de segurança para garantir o retorno de uma das chaves do objeto STRATEGIES
        const categorias = ['AGENDAR_MANUTENCAO', 'RELATORIO', 'BUSCAR_APOLICE', 'OUTRO'];
        
        // Busca se alguma das categorias válidas está presente na resposta da IA
        const encontrada = categorias.find(cat => texto.includes(cat));

        // Log para monitorar a inteligência no terminal do servidor
        console.log(`[INTENT_CLASSIFIER] Entrada: "${mensagem}" -> Detectado: ${encontrada || 'OUTRO'}`);

        return encontrada || 'OUTRO'; 
    } catch (error) {
        console.error("[INTENT_CLASSIFIER_ERROR]:", error);
        return "OUTRO"; 
    }
}