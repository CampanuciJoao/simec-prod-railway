// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 18.0 - ESTRATÉGIA DE CONTORNO (FALLBACK) AUTOMÁTICO

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave API não encontrada.");

    console.log(`[AGENTE] Chave ativa: ${API_KEY.substring(0, 6)}...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // TENTATIVA 1: O modelo que você quer (1.5 Flash)
    try {
        console.log("[AGENTE] Tentativa 1: gemini-1.5-flash");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Você é o Guardião SIMEC. Usuário: ${usuarioNome}. Responda: ${perguntaUsuario}`);
        const response = await result.response;
        return response.text();

    } catch (error) {
        // Se o erro for 404 (Modelo não encontrado/faturamento pendente)
        if (error.message.includes("404") || error.message.includes("not found")) {
            console.warn("[AGENTE] Modelo 1.5 Flash ainda não liberado pelo Google. Tentando Fallback...");
            
            // TENTATIVA 2: O modelo de segurança (gemini-pro)
            try {
                console.log("[AGENTE] Tentativa 2: gemini-pro (Modelo de Segurança)");
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
                const result = await fallbackModel.generateContent(`Você é o Guardião SIMEC. Usuário: ${usuarioNome}. Responda: ${perguntaUsuario}`);
                const response = await result.response;
                return response.text();
                
            } catch (fallbackError) {
                console.error("[AGENTE] Falha total em todos os modelos.");
                throw new Error("O Google ainda está ativando sua conta paga. Tente novamente em instantes.");
            }
        }
        
        throw error;
    }
};