// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 4.0 - CORREÇÃO DE DEFINIÇÃO E MODELO ESTÁVEL

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

// 1. Definição da Chave e Inicialização (CRÍTICO: Isso deve estar no topo)
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

/**
 * Busca dados reais do banco para fundamentar a resposta da IA.
 */
async function obterDadosTecnicos(tag) {
    try {
        const dados = await prisma.equipamento.findUnique({
            where: { tag },
            include: {
                manutencoes: {
                    include: { notasAndamento: true },
                    orderBy: { dataHoraAgendamentoInicio: 'desc' },
                    take: 5
                },
                unidade: true
            }
        });
        return dados ? JSON.stringify(dados) : "Equipamento não localizado.";
    } catch (err) {
        return "Erro ao acessar banco de dados.";
    }
}

/**
 * Processador principal do Agente Guardião.
 */
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    // Validação de segurança
    if (!API_KEY) {
        throw new Error("A chave GEMINI_API_KEY não foi configurada no servidor.");
    }

    try {
        // Usamos o modelo 'gemini-pro' que é o mais compatível com a biblioteca atual
        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro"
        });

        const contextoSimec = `Você é o Guardião SIMEC, assistente de Engenharia Clínica.
        Usuário atual: ${usuarioNome || 'Administrador'}.
        Responda de forma técnica, prestativa e em Português do Brasil.`;

        console.log(`[AGENTE] Processando pergunta de ${usuarioNome}: ${perguntaUsuario}`);

        // Criamos o prompt consolidado para garantir resposta sem erros de histórico
        const promptFinal = `${contextoSimec}\n\nPergunta do Usuário: ${perguntaUsuario}`;

        const result = await model.generateContent(promptFinal);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("A IA não conseguiu gerar texto.");

        return text;

    } catch (error) {
        console.error("--- ERRO NO GEMINI SERVICE ---");
        console.error("Mensagem:", error.message);
        
        // Tratamento específico para o erro de localização do Railway
        if (error.message.includes("location") || error.message.includes("supported")) {
            throw new Error("O Google ainda não suporta o Gemini na região do seu servidor Railway. Mude a região para 'us-east1' nas configurações do Railway.");
        }

        throw new Error(`Falha na IA: ${error.message}`);
    }
};