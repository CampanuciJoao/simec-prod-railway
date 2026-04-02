// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 11.0 - FORÇANDO API STABLE (V1) PARA EVITAR ERRO 404

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

const API_KEY = process.env.GEMINI_API_KEY;

// AJUSTE CRÍTICO: Removi a inicialização global para garantir que a chave 
// seja lida corretamente a cada chamada e configurada para a versão estável.
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    if (!API_KEY) throw new Error("Chave API não configurada no Railway.");

    try {
        // Inicializa com a versão 'v1' (Estável) em vez da 'v1beta'
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

        let dadosAdicionais = "";
        const extrairTag = perguntaUsuario.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/);
        
        if (extrairTag) {
            const tag = extrairTag[0].toUpperCase();
            const equipamento = await prisma.equipamento.findUnique({
                where: { tag },
                select: {
                    modelo: true, tag: true, status: true,
                    unidade: { select: { nomeSistema: true } },
                    manutencoes: {
                        take: 3,
                        orderBy: { dataHoraAgendamentoInicio: 'desc' },
                        select: { tipo: true, status: true, descricaoProblemaServico: true }
                    }
                }
            });
            if (equipamento) dadosAdicionais = `CONTEXTO: ${JSON.stringify(equipamento)}`;
        }

        const prompt = `Você é o Guardião SIMEC. Usuário: ${usuarioNome}. ${dadosAdicionais} Responda técnico e direto em PT-BR.`;

        // Log para você ver no Railway que o código novo entrou
        console.log(`[AGENTE] Tentativa via API V1 Estável...`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("--- ERRO NA IA (DIAGNÓSTICO V1) ---");
        console.error("Mensagem:", error.message);
        
        if (error.message.includes("404")) {
            throw new Error("O Google ainda está ativando seu faturamento. Isso pode levar até 2 horas após o pagamento. Verifique se a Chave no Railway é a NOVA.");
        }
        throw new Error(error.message);
    }
};