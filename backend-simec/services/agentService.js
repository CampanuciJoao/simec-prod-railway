// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 14.0 - DIAGNÓSTICO COM MODELO ALTERNATIVO (8B)

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave API não encontrada no Railway.");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // TESTE: Mudamos para o modelo '8b', que é o mais leve de todos.
        // Isso serve para ver se o Google libera QUALQUER acesso para sua chave.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

        console.log(`[AGENTE] Tentando diagnóstico com modelo 1.5-Flash-8b...`);

        const promptFinal = `Você é o Guardião SIMEC. Responda curto: ${perguntaUsuario}`;
        
        const result = await model.generateContent(promptFinal);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("--- FALHA NO TESTE DE MODELO 8B ---");
        console.error("Causa:", error.message);

        // Se der 404 de novo, vamos tentar o modelo 1.0 Pro como ÚLTIMA tentativa técnica
        if (error.message.includes("404")) {
            throw new Error("O Google ainda não sincronizou seu faturamento com os servidores de IA. Isso é um atraso interno deles que pode levar até 24h.");
        }
        throw error;
    }
};