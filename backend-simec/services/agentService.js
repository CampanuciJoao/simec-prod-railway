// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 3.0 - DIAGNÓSTICO AVANÇADO E INTELIGÊNCIA PREDITIVA

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

// 1. Validação de Segurança da Chave de API
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("[ERRO CRÍTICO] Variável GEMINI_API_KEY não configurada no Railway!");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// --- FERRAMENTAS TÉCNICAS (INTELIGÊNCIA DE DADOS) ---

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
        return dados ? JSON.stringify(dados) : "Equipamento não localizado no inventário.";
    } catch (err) {
        return "Erro ao acessar base de dados.";
    }
}

// --- PROCESSAMENTO PRINCIPAL ---

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    // Verificação de pré-vôo
    if (!API_KEY) throw new Error("Chave de API não configurada no servidor.");

    try {
        // Usamos o modelo 1.5-flash para maior estabilidade e velocidade
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `Você é o Guardião SIMEC, um Engenheiro Clínico Sênior com 20 anos de experiência.
            Seu tom é profissional, técnico e extremamente prestativo.
            O usuário atual é ${usuarioNome || 'Administrador'}.
            
            DIRETRIZES DE INTELIGÊNCIA:
            1. Se o usuário perguntar sobre um equipamento, analise sinais de falha como 'ruído', 'calor' ou 'travamentos'.
            2. Sempre que detectar recorrência de problemas, sugira abrir uma Manutenção Preditiva.
            3. Você tem permissão para analisar prazos e sugerir inspeções.
            4. Se não tiver certeza de um dado, peça a TAG do equipamento.`
        });

        console.log(`[AGENTE] Iniciando análise para o usuário: ${usuarioNome}`);

        // Chamada direta para evitar erros de histórico de chat corrompido
        const result = await model.generateContent(perguntaUsuario);
        const response = await result.response;
        const texto = response.text();

        if (!texto) throw new Error("A IA não conseguiu gerar uma resposta válida.");

        return texto;

    } catch (error) {
        // --- BLOCO DE DIAGNÓSTICO PARA RAILWAY ---
        console.error("========== ERRO NO AGENTE GEMINI ==========");
        console.error("Causa:", error.message);
        
        // Identifica erros comuns de localização do Railway
        if (error.message.includes("location") || error.message.includes("supported")) {
            console.error("DICA: O Google não suporta o Gemini na região atual do seu servidor Railway.");
            throw new Error("O Google bloqueou a conexão por conta da região do servidor (Railway). Tente mudar a região do serviço para 'us-east1' nas configurações do Railway.");
        }

        // Identifica erros de chave
        if (error.message.includes("API key")) {
            console.error("DICA: Sua GEMINI_API_KEY parece ser inválida ou expirou.");
            throw new Error("Chave da Inteligência Artificial inválida. Verifique a configuração.");
        }

        throw new Error(`Falha técnica na IA: ${error.message}`);
    }
};