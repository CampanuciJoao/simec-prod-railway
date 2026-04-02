// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 7.0 - TESTE EM PLANO GRATUITO (GEMINI-PRO)

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
        const equipamento = await prisma.equipamento.findUnique({
            where: { tag },
            include: {
                unidade: true,
                manutencoes: {
                    take: 5, // Aumentei para 5 para dar mais inteligência à IA
                    orderBy: { dataHoraAgendamentoInicio: 'desc' },
                    include: { notasAndamento: true }
                }
            }
        });
        if (!equipamento) return "Equipamento com esta TAG não foi encontrado no sistema.";
        return JSON.stringify(equipamento);
    } catch (e) {
        return "Erro técnico ao consultar o banco de dados.";
    }
}

/**
 * PROCESSADOR: Envia a pergunta ao Gemini e retorna a resposta.
 */
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    if (!API_KEY) throw new Error("Chave GEMINI_API_KEY não encontrada nas variáveis do Railway.");

    try {
        // Usando 'gemini-pro' que é mais permissivo no plano gratuito sem pré-pagamento
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Identifica se o usuário digitou algo como 'CT-01' ou 'RAIOX-10'
        let dadosAdicionais = "";
        const extrairTag = perguntaUsuario.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/);
        if (extrairTag) {
            dadosAdicionais = await obterContextoDoBanco(extrairTag[0].toUpperCase());
        }

        // Criamos um bloco de texto único para a IA não se perder
        const promptFinal = `
        Você é o Guardião SIMEC, assistente virtual de Engenharia Clínica.
        Quem está falando com você: ${usuarioNome || 'Administrador'}.
        
        CONTEXTO DO BANCO DE DADOS (Se vazio, ignore):
        ${dadosAdicionais}

        PERGUNTA DO USUÁRIO:
        "${perguntaUsuario}"

        INSTRUÇÕES:
        1. Responda em Português do Brasil.
        2. Seja técnico, porém direto.
        3. Se houver dados de manutenção acima, analise se o defeito é recorrente.
        4. Se não encontrar dados do equipamento, responda apenas à pergunta do usuário de forma genérica.
        `;

        console.log(`[AGENTE] Processando via Gemini-Pro: ${perguntaUsuario}`);

        const result = await model.generateContent(promptFinal);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("O Google Gemini não devolveu texto.");

        return text;

    } catch (error) {
        console.error("--- ERRO NA IA (DIAGNÓSTICO) ---");
        console.error("Mensagem:", error.message);

        // Se mesmo o gemini-pro der 404, o Google bloqueou sua chave até você validar o cartão/pagar os R$ 50
        if (error.message.includes("404")) {
            throw new Error("O Google bloqueou o acesso gratuito para esta chave de API. Isso acontece quando a conta precisa de verificação de faturamento (Billing) no Google AI Studio.");
        }

        throw new Error(`Falha na IA: ${error.message}`);
    }
};