// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 10.0 - ESTÁVEL PARA CONTA PAGA E OTIMIZADA PARA BAIXO CUSTO

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

// 1. Configuração da Chave de API
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

/**
 * FERRAMENTA: Busca dados reais no banco para a IA analisar.
 * Otimizada para buscar apenas o necessário e economizar tokens (dinheiro).
 */
async function obterContextoDoBanco(tag) {
    try {
        console.log(`[AGENTE] Verificando histórico do equipamento: ${tag}`);
        const equipamento = await prisma.equipamento.findUnique({
            where: { tag },
            select: {
                modelo: true,
                tag: true,
                status: true,
                setor: true,
                unidade: { select: { nomeSistema: true } },
                manutencoes: {
                    take: 3, // Apenas as 3 últimas para economizar
                    orderBy: { dataHoraAgendamentoInicio: 'desc' },
                    select: {
                        tipo: true,
                        status: true,
                        descricaoProblemaServico: true,
                        dataConclusao: true
                    }
                }
            }
        });
        
        if (!equipamento) return null;
        
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
    if (!API_KEY) throw new Error("Chave GEMINI_API_KEY não configurada no servidor.");

    try {
        // MODELO: 'gemini-1.5-flash' é o ideal. Se der 404, o Google ainda não liberou o faturamento.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Tenta capturar uma TAG (Ex: CTES-0004)
        let dadosAdicionais = "";
        const extrairTag = perguntaUsuario.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/);
        
        if (extrairTag) {
            const contexto = await obterContextoDoBanco(extrairTag[0].toUpperCase());
            if (contexto) {
                dadosAdicionais = `\n[DADOS TÉCNICOS DO SISTEMA]:\n${contexto}\n`;
            }
        }

        const promptSistema = `Você é o Guardião SIMEC, assistente de Engenharia Clínica.
        Usuário: ${usuarioNome || 'Administrador'}.
        ${dadosAdicionais}
        INSTRUÇÕES:
        1. Responda em Português-BR.
        2. Seja técnico, útil e muito direto (evite textos longos para economizar tokens).
        3. Se houver dados do equipamento acima, analise se ele está apresentando falhas repetitivas.
        4. Se não houver dados, responda com base no seu conhecimento geral de engenharia clínica.`;

        console.log(`[AGENTE] Enviando pergunta para a IA...`);

        // Executa a geração de conteúdo
        const result = await model.generateContent([promptSistema, perguntaUsuario]);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("A IA não gerou uma resposta válida.");

        return text;

    } catch (error) {
        console.error("--- ERRO NA IA (DIAGNÓSTICO) ---");
        console.error("Causa real:", error.message);
        
        // Tratamento especial para o erro 404 de faturamento
        if (error.message.includes("404") || error.message.includes("not found")) {
            throw new Error("O projeto ainda consta como 'Gratuito' no Google. Certifique-se de que criou uma NOVA CHAVE de API após ativar o faturamento.");
        }

        throw new Error(`Instabilidade na IA: ${error.message}`);
    }
};