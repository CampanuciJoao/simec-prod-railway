// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 23.0 - REFORMULADA COM SDK OFICIAL DO GOOGLE

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!API_KEY) {
        throw new Error("A chave GEMINI_API_KEY não foi configurada no servidor.");
    }

    try {
        // 1. Inicializa o SDK oficial do Google
        const genAI = new GoogleGenerativeAI(API_KEY);

        // 2. Configura o modelo (Usando o 1.5-flash que é o mais estável e rápido)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
            }
        });

        // 3. Busca um resumo rápido do banco para dar "Contexto" à IA (O "Cérebro" do SIMEC)
        const totalEquipamentos = await prisma.equipamento.count();
        const inoperantes = await prisma.equipamento.count({ where: { status: 'Inoperante' } });
        const emManutencao = await prisma.equipamento.count({ where: { status: 'EmManutencao' } });

        // 4. Monta o Prompt com o contexto do sistema
        const promptLocal = `
            Você é o "Guardião SIMEC", um assistente especialista em Engenharia Clínica.
            Estamos no sistema SIMEC.
            Dados atuais do inventário:
            - Total de equipamentos cadastrados: ${totalEquipamentos}
            - Equipamentos parados (Inoperantes): ${inoperantes}
            - Equipamentos em manutenção agora: ${emManutencao}

            O usuário logado é: ${usuarioNome}.
            Responda de forma profissional, prestativa e curta em Português do Brasil.
            Pergunta do usuário: ${perguntaUsuario}
        `;

        console.log(`[AGENTE] Enviando requisição para o Google Gemini...`);
        
        // 5. Executa a chamada
        const result = await model.generateContent(promptLocal);
        const response = await result.response;
        const text = response.text();

        console.log(`[AGENTE] Resposta recebida com sucesso.`);
        return text;

    } catch (error) {
        console.error(`[AGENTE_ERRO_CRÍTICO]:`, error);
        
        // Se for erro de chave inválida ou exaurida
        if (error.message?.includes("API_KEY_INVALID")) {
            throw new Error("Erro de Autenticação: A sua API Key do Google é inválida ou expirou.");
        }

        // Se for erro de região (muito comum em servidores gringos)
        if (error.message?.includes("location is not supported")) {
            throw new Error("O Google ainda não liberou o Gemini para a região onde seu servidor está hospedado.");
        }

        // Erro genérico mas com o detalhe técnico para você ler no console
        throw new Error(`Falha na comunicação com a IA: ${error.message}`);
    }
};