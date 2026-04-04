// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 30.0 - CORRIGIDA COM BASE NO TESTE DE MODELOS DO USUÁRIO

import axios from 'axios';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    // Limpeza da chave
    const API_KEY = process.env.GEMINI_API_KEY?.replace(/['" ]/g, '').trim();

    if (!API_KEY) throw new Error("Chave não encontrada no ambiente.");

    try {
        // Contexto do banco (Prisma)
        const total = await prisma.equipamento.count();
        const inoperantes = await prisma.equipamento.count({ where: { status: 'Inoperante' } });

        const prompt = `Você é o Guardião SIMEC. Hospital com ${total} aparelhos, ${inoperantes} parados. Usuário: ${usuarioNome}. Responda curto: ${perguntaUsuario}`;

        /**
         * AJUSTE DE ROTA:
         * Usaremos o sufixo '-latest' no modelo Flash. 
         * É o nome oficial para evitar o erro 404 que você está recebendo.
         */
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

        console.log("[IA] Chamando modelo 1.5-flash-latest...");

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        return response.data.candidates[0].content.parts[0].text;

    } catch (error) {
        // FALLBACK: Se o Flash der 404, tentamos o 'gemini-pro' que é o modelo raiz
        try {
            console.warn("[IA] Flash falhou, tentando gemini-pro...");
            const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
            const resPro = await axios.post(urlPro, {
                contents: [{ parts: [{ text: perguntaUsuario }] }]
            });
            return resPro.data.candidates[0].content.parts[0].text;
        } catch (errFinal) {
            const msg = errFinal.response?.data?.error?.message || errFinal.message;
            console.error("ERRO CRÍTICO IA:", msg);
            throw new Error(`O Google retornou: ${msg}`);
        }
    }
};