// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 17.0 - A PROVA DE FALHAS COM LOG DE CONFERÊNCIA

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    
    if (!API_KEY) {
        throw new Error("ERRO: Variável GEMINI_API_KEY não encontrada no Railway.");
    }

    // LOG DE SEGURANÇA: Isso vai aparecer no seu log preto do Railway
    // Verifique se esses 4 primeiros dígitos batem com a chave que você criou por último.
    console.log(`[AGENTE] Iniciando com a chave: ${API_KEY.substring(0, 4)}...`);

    try {
        // Inicializamos usando a versão 'v1' (Estável/Produção)
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // Usamos exatamente o ID do modelo que apareceu com cota no seu print
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1" }
        );

        console.log(`[AGENTE] Consultando modelo gemini-1.5-flash (v1)...`);

        const promptBase = `Você é o Guardião SIMEC, assistente de engenharia clínica. Usuário: ${usuarioNome}. Responda em PT-BR de forma curta.`;
        
        // Chamada de conteúdo
        const result = await model.generateContent(`${promptBase}\n\nPergunta: ${perguntaUsuario}`);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("Resposta da IA veio vazia.");

        return text;

    } catch (error) {
        console.error("--- ERRO CRÍTICO NO AGENTE ---");
        console.error("MENSAGEM:", error.message);

        if (error.message.includes("404")) {
            throw new Error("O Google retornou 404 (Não Encontrado). Verifique se a chave no Railway é a que você criou DEPOIS de pagar os R$ 50,00.");
        }

        throw new Error(`Erro na IA: ${error.message}`);
    }
};