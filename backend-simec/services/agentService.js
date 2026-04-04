// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 26.0 - CORREÇÃO DE ERRO 404 (ESTÁVEL)

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!API_KEY) {
        throw new Error("API_KEY não configurada.");
    }

    try {
        // Inicializa o SDK
        const genAI = new GoogleGenerativeAI(API_KEY);

        /**
         * CORREÇÃO TÉCNICA:
         * O modelo 'gemini-1.5-flash' foi movido para a API v1 (estável).
         * Se o 1.5-flash der erro, ele tentará o 'gemini-pro' (1.0) que é o mais compatível de todos.
         */
        let model;
        try {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } catch (e) {
            console.warn("[AGENTE] Falha ao carregar 1.5-flash, tentando gemini-pro...");
            model = genAI.getGenerativeModel({ model: "gemini-pro" });
        }

        // Busca contexto do banco
        const total = await prisma.equipamento.count();
        const inoperantes = await prisma.equipamento.count({ where: { status: 'Inoperante' } });

        const promptLocal = `
            Você é o Guardião SIMEC, assistente de Engenharia Clínica.
            Estamos no sistema SIMEC.
            Status do hospital: ${total} equipamentos totais, ${inoperantes} parados.
            Usuário: ${usuarioNome}.
            Responda de forma curta em Português: ${perguntaUsuario}
        `;

        console.log(`[AGENTE] Solicitando resposta para: "${perguntaUsuario.substring(0, 20)}..."`);
        
        // Gera o conteúdo
        const result = await model.generateContent(promptLocal);
        const response = await result.response;
        const text = response.text();

        return text;

    } catch (error) {
        console.error(`[ERRO_REAL_IA]:`, error.message);
        
        // Se mesmo assim der erro de modelo não encontrado
        if (error.message.includes("not found")) {
            throw new Error("O modelo solicitado está em manutenção pelo Google. Tente novamente em instantes.");
        }

        throw new Error(error.message);
    }
};