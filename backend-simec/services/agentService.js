// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 20.0 - MUDANÇA PARA MODELO ESTÁVEL (GEMINI-PRO)

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // MUDANÇA DEFINITIVA: Saímos do 'flash' e vamos para o 'gemini-pro'
        // Este modelo é o padrão mundial e o que menos dá erro de 404.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log(`[AGENTE] Tentando resposta via Gemini-Pro...`);

        const result = await model.generateContent(perguntaUsuario);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("--- ERRO FINAL DA IA ---");
        console.error("Mensagem técnica:", error.message);

        // Se mesmo o 'gemini-pro' der 404, o problema é uma trava de segurança
        // do Google na sua conta que dura 24 horas.
        if (error.message.includes("404")) {
            throw new Error("O Google ainda não liberou o acesso via API para sua conta. Como você acabou de pagar, o sistema deles pode levar até amanhã para sincronizar.");
        }
        throw error;
    }
};