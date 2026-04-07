// simec/backend-simec/services/agent/intentClassifier.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicialização com tratamento de espaços na chave
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
// FIXO: Versão 2.5 mantida conforme exigência do ambiente
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

/**
 * Classifica a intenção do usuário. 
 * Possui uma rede de segurança manual para casos de falha da API (Erro 503).
 */
export async function classificarIntencao(mensagem) {
    const msgLimpa = mensagem.toLowerCase();

    // 1. REDE DE SEGURANÇA MANUAL (Heurística Sênior)
    // Se a frase contiver palavras óbvias, classificamos antes mesmo de chamar a IA.
    // Isso economiza tokens e resolve o problema se o Google estiver fora do ar.
    const termosAgendamento = ['agendar', 'marcar', 'manutenção', 'corretiva', 'preventiva', 'conserto', 'reparo', 'abrir os'];
    if (termosAgendamento.some(t => msgLimpa.includes(t))) {
        console.log(`[INTENT_MANUAL] Detectado Agendamento por palavra-chave.`);
        return 'AGENDAR_MANUTENCAO';
    }

    const prompt = `
    Você é um triador de tarefas hospitalares. 
    Analise a frase e responda APENAS o nome da categoria que melhor descreve o DESEJO do usuário.

    CATEGORIAS:
    - AGENDAR_MANUTENCAO: Pedidos de conserto, preventiva, corretiva ou novos agendamentos.
    - RELATORIO: Pedidos de listas, PDFs ou histórico.
    - BUSCAR_APOLICE: Consultas sobre seguros e apólices.
    - OUTRO: Apenas "Oi", "Tudo bem" ou conversas sem pedido de ação clara.

    FRASE DO USUÁRIO: "${mensagem}"

    REGRA: Ignore saudações iniciais. Responda apenas o nome da categoria em MAIÚSCULAS.
    `;

    try {
        const result = await model.generateContent(prompt);
        let respostaIA = result.response.text().trim().toUpperCase();
        
        // Limpeza de Markdown
        respostaIA = respostaIA.replace(/```|JSON/g, "").trim();

        const categoriasValidas = ['AGENDAR_MANUTENCAO', 'RELATORIO', 'BUSCAR_APOLICE', 'OUTRO'];
        const detectada = categoriasValidas.find(cat => respostaIA.includes(cat));

        console.log(`[IA_INTENT] Input: "${mensagem}" | Detectada: ${detectada || 'OUTRO'}`);

        return detectada || 'OUTRO'; 

    } catch (error) {
        console.error("[IA_INTENT_ERROR] Falha na API do Google:", error.message);
        
        // FALLBACK FINAL: Se a API deu erro (503), tentamos uma última checagem por palavras-chave
        if (msgLimpa.includes('manutenção') || msgLimpa.includes('quebrou')) {
            return 'AGENDAR_MANUTENCAO';
        }
        
        return "OUTRO"; 
    }
}