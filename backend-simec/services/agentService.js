// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 6.0 - CORREÇÃO DEFINITIVA DO ERRO 404 E INTEGRAÇÃO DE DADOS

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

// 1. Configuração da Chave de API
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

/**
 * FERRAMENTA: Busca dados reais para a IA basear sua análise técnica.
 * Isso evita que o robô "invente" informações.
 */
async function obterContextoDoBanco(tag) {
    try {
        const equipamento = await prisma.equipamento.findUnique({
            where: { tag },
            include: {
                unidade: true,
                manutencoes: {
                    take: 3,
                    orderBy: { dataHoraAgendamentoInicio: 'desc' },
                    include: { notasAndamento: true }
                }
            }
        });
        if (!equipamento) return "Equipamento não encontrado.";
        return JSON.stringify(equipamento);
    } catch (e) {
        return "Erro ao consultar o banco de dados.";
    }
}

/**
 * PROCESSADOR: Envia a pergunta ao Gemini e retorna a resposta técnica.
 */
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    if (!API_KEY) throw new Error("GEMINI_API_KEY não configurada no Railway.");

    try {
        // CORREÇÃO DO 404: Usando o nome de modelo mais estável para a versão 1.5
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Tenta identificar se o usuário mencionou uma TAG (Ex: CT-01 ou RAIOX-04)
        let dadosAdicionais = "";
        const extrairTag = perguntaUsuario.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/);
        if (extrairTag) {
            dadosAdicionais = await obterContextoDoBanco(extrairTag[0]);
        }

        const promptSistema = `Você é o Guardião SIMEC, assistente de engenharia clínica.
        Usuário: ${usuarioNome || 'Administrador'}.
        Dados do Banco: ${dadosAdicionais}
        Instruções: Responda em Português-BR de forma técnica e direta. 
        Se houver falhas repetitivas nos dados, sugira uma manutenção preditiva.`;

        console.log(`[AGENTE] Iniciando consulta para: ${perguntaUsuario}`);

        // Chamada de geração de conteúdo estruturada
        const result = await model.generateContent([promptSistema, perguntaUsuario]);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("A IA não gerou uma resposta.");

        return text;

    } catch (error) {
        // LOG DE DIAGNÓSTICO NO RAILWAY
        console.error("--- ERRO NA IA (DIAGNÓSTICO) ---");
        console.error("Causa:", error.message);

        // Se o erro for de modelo não encontrado (404), tentamos uma última explicação amigável
        if (error.message.includes("404") || error.message.includes("not found")) {
            throw new Error("O modelo gemini-1.5-flash não foi localizado. Verifique se o seu faturamento no Google AI Studio está ativo ou se a API Key tem permissões.");
        }

        throw new Error(error.message);
    }
};