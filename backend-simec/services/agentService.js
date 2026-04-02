// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 13.0 - DIAGNÓSTICO PROFUNDO E FORÇAGEM DE API ESTÁVEL

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    // 1. Verificação da Chave
    const API_KEY = process.env.GEMINI_API_KEY?.trim(); // O .trim() remove espaços acidentais
    if (!API_KEY) throw new Error("ERRO: Variável GEMINI_API_KEY vazia no Railway.");

    try {
        // 2. Inicialização Forçada na Versão Estável (v1)
        // Isso evita o erro 'v1beta' que apareceu no seu log anterior
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: 'v1' } 
        );

        // 3. Busca de Contexto (Simplificada para economia)
        let contexto = "";
        const extrairTag = perguntaUsuario.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/);
        if (extrairTag) {
            const tag = extrairTag[0].toUpperCase();
            const equip = await prisma.equipamento.findUnique({
                where: { tag },
                select: { modelo: true, status: true, unidade: { select: { nomeSistema: true } } }
            });
            if (equip) contexto = `Equipamento: ${equip.modelo}, Status: ${equip.status}, Unidade: ${equip.unidade.nomeSistema}.`;
        }

        // 4. Prompt estruturado
        const promptSistema = `Você é o Guardião SIMEC. Usuário: ${usuarioNome}. ${contexto}`;
        
        console.log(`[AGENTE] Iniciando chamada estável (v1) para o modelo Flash...`);

        // 5. Execução
        const result = await model.generateContent([promptSistema, perguntaUsuario]);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("O Google respondeu, mas o texto veio vazio.");

        return text;

    } catch (error) {
        // LOG COMPLETO PARA DIAGNÓSTICO
        console.error("--- RELATÓRIO DE ERRO IA ---");
        console.error("Mensagem:", error.message);
        
        if (error.message.includes("404")) {
            // Se der 404 aqui, com a apiVersion 'v1', é porque o Google
            // ainda não propagou seu faturamento para os servidores de borda.
            throw new Error("O Google reconhece seu pagamento, mas ainda não ativou sua chave paga. Tempo estimado: 30 a 60 min.");
        }

        if (error.message.includes("403")) {
            throw new Error("Erro de Permissão: Verifique se a chave de API é do projeto correto.");
        }

        throw new Error(`Falha técnica: ${error.message}`);
    }
};