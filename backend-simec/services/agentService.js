// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 15.0 - TESTE COM MODELO 2.0 FLASH E INSTRUÇÃO DE SISTEMA

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave API ausente no Railway.");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        // TESTE: Mudamos para o modelo 2.0 Flash (Mais novo e estável para faturamento novo)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            systemInstruction: "Você é o Guardião SIMEC, assistente de engenharia clínica. Responda de forma técnica e curta em Português-BR."
        });

        console.log(`[AGENTE] Tentando conexão com Gemini 2.0 Flash...`);

        // Formato de envio simplificado (apenas a pergunta, a instrução já está no model acima)
        const result = await model.generateContent(perguntaUsuario);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("--- FALHA TÉCNICA AGENTE ---");
        console.error("Causa:", error.message);

        // Se o 2.0 também der 404, tentaremos uma última mensagem informativa
        if (error.message.includes("404")) {
            throw new Error("O Google ainda não habilitou modelos Flash para sua conta. Verifique na aba 'Limite de taxa' do Google Studio se o seu limite não está em 0.");
        }
        throw error;
    }
};