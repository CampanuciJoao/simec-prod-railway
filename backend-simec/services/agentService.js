// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 8.0 - ATIVADA APÓS LIBERAÇÃO DE CRÉDITO

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

// 1. Configuração da Chave de API
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

/**
 * FERRAMENTA: Busca dados reais no banco para a IA analisar.
 */
async function obterContextoDoBanco(tag) {
    try {
        console.log(`[AGENTE] Buscando dados do equipamento: ${tag}`);
        const equipamento = await prisma.equipamento.findUnique({
            where: { tag },
            include: {
                unidade: true,
                manutencoes: {
                    take: 5,
                    orderBy: { dataHoraAgendamentoInicio: 'desc' },
                    include: { notasAndamento: true }
                }
            }
        });
        
        if (!equipamento) return "Equipamento não encontrado no SIMEC.";
        
        return JSON.stringify(equipamento);
    } catch (e) {
        console.error("[AGENTE_ERRO_BANCO]:", e.message);
        return "Erro ao acessar o banco de dados.";
    }
}

/**
 * PROCESSADOR: Envia a pergunta ao Gemini e retorna a resposta técnica.
 */
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    if (!API_KEY) throw new Error("GEMINI_API_KEY não configurada.");

    try {
        // Agora usamos o 1.5 Flash (O melhor custo-benefício e velocidade)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Tenta capturar uma TAG no formato AAA-000 ou Texto-000
        let dadosAdicionais = "";
        const extrairTag = perguntaUsuario.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/);
        
        if (extrairTag) {
            const tagEncontrada = extrairTag[0].toUpperCase();
            dadosAdicionais = await obterContextoDoBanco(tagEncontrada);
        }

        const promptSistema = `
        Você é o Guardião SIMEC, assistente sênior de Engenharia Clínica.
        Usuário atual: ${usuarioNome || 'Administrador'}.
        
        CONTEXTO TÉCNICO DO BANCO DE DADOS:
        ${dadosAdicionais}

        INSTRUÇÕES DE RESPOSTA:
        1. Responda em Português (Brasil).
        2. Seja técnico, direto e profissional.
        3. Se houver dados de manutenção acima, analise se há falhas repetitivas (Ex: muitas corretivas no mesmo mês).
        4. Se o usuário perguntar algo que não está nos dados, use seu conhecimento de engenharia clínica para ajudar.
        `;

        console.log(`[AGENTE] Consultando Gemini 1.5 Flash...`);

        const result = await model.generateContent([promptSistema, perguntaUsuario]);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("IA retornou resposta vazia.");

        return text;

    } catch (error) {
        console.error("--- ERRO NA IA (DIAGNÓSTICO) ---");
        console.error("Causa:", error.message);
        
        // Mensagem amigável para o usuário no chat
        if (error.message.includes("404")) {
            throw new Error("O Google ainda está processando seu pagamento. Aguarde 10 minutos e tente novamente.");
        }

        throw new Error(`Erro na IA: ${error.message}`);
    }
};