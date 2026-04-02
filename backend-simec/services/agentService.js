// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 5.0 - MODELO ULTRA-ESTÁVEL E DIAGNÓSTICO REAL

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
// Inicialização segura
const genAI = new GoogleGenerativeAI(API_KEY || "");

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    if (!API_KEY) throw new Error("Chave GEMINI_API_KEY não configurada.");

    try {
        // Trocamos para o identificador mais robusto da v1.5
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const contexto = `Você é o Guardião SIMEC, assistente sênior de engenharia clínica.
        Usuário: ${usuarioNome || 'Administrador'}.
        Responda de forma técnica e prestativa em Português-BR.`;

        console.log(`[AGENTE] Solicitando IA para: ${perguntaUsuario}`);

        // Geração de conteúdo direta
        const result = await model.generateContent(`${contexto}\n\nPergunta: ${perguntaUsuario}`);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("A IA não retornou texto.");

        return text;

    } catch (error) {
        // LOG COMPLETO NO RAILWAY
        console.error("--- FALHA NO SERVIÇO GEMINI ---");
        console.error("ERRO:", error.message);
        
        // Retorna o erro real para o chat para sabermos o que o Google disse
        throw new Error(`Google API disse: ${error.message}`);
    }
};