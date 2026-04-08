// simec/backend-simec/services/agent/intentClassifier.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function classificarHeuristica(mensagem) {
    const msg = mensagem.toLowerCase().trim();

    const termosRelatorio = [
        'quando foi',
        'qual foi',
        'última',
        'ultima',
        'mais recente',
        'histórico',
        'historico',
        'relatório',
        'relatorio',
        'quantas',
        'quais',
        'listar',
        'liste',
        'mostrar',
        'mostre',
        'consulta',
        'feita em',
        'feitas em',
        'no período',
        'periodo',
        'último ano',
        'ultimo ano'
    ];

    const termosAgendamento = [
        'agendar',
        'marcar',
        'abrir os',
        'abrir uma os',
        'abrir chamado',
        'nova manutenção',
        'novo agendamento',
        'quero agendar',
        'preciso agendar'
    ];

    if (termosRelatorio.some(t => msg.includes(t))) {
        return 'RELATORIO';
    }

    if (termosAgendamento.some(t => msg.includes(t))) {
        return 'AGENDAR_MANUTENCAO';
    }

    return null;
}

/**
 * Classifica a intenção do usuário.
 */
export async function classificarIntencao(mensagem) {
    const heuristica = classificarHeuristica(mensagem);
    if (heuristica) {
        console.log(`[INTENT_MANUAL] Detectado ${heuristica} por heurística.`);
        return heuristica;
    }

    const prompt = `
    Você é um triador de tarefas hospitalares.
    Classifique a mensagem do usuário em apenas uma categoria:

    - AGENDAR_MANUTENCAO: quando o usuário quer criar, marcar, agendar ou abrir uma manutenção
    - RELATORIO: quando o usuário quer consultar histórico, última manutenção, relatórios, listas ou períodos
    - BUSCAR_APOLICE: quando o usuário quer consultar seguro ou apólice
    - OUTRO: saudação ou conversa sem ação clara

    Regras importantes:
    - "quando foi a última preventiva em Coxim?" = RELATORIO
    - "quais preventivas no último ano?" = RELATORIO
    - "marcar uma preventiva para amanhã" = AGENDAR_MANUTENCAO
    - "abrir uma corretiva" = AGENDAR_MANUTENCAO

    Mensagem: "${mensagem}"

    Responda APENAS com uma das categorias:
    AGENDAR_MANUTENCAO
    RELATORIO
    BUSCAR_APOLICE
    OUTRO
    `;

    try {
        const result = await model.generateContent(prompt);
        let respostaIA = result.response.text().trim().toUpperCase();
        respostaIA = respostaIA.replace(/```|JSON/g, "").trim();

        const categoriasValidas = ['AGENDAR_MANUTENCAO', 'RELATORIO', 'BUSCAR_APOLICE', 'OUTRO'];
        const detectada = categoriasValidas.find(cat => respostaIA.includes(cat));

        console.log(`[IA_INTENT] Input: "${mensagem}" | Detectada: ${detectada || 'OUTRO'}`);
        return detectada || 'OUTRO';
    } catch (error) {
        console.error("[IA_INTENT_ERROR] Falha na API do Google:", error.message);
        return 'OUTRO';
    }
}