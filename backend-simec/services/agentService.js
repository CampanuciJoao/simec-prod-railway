import axios from 'axios';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!API_KEY) {
        throw new Error("API_KEY não configurada no .env/.railway.");
    }

    try {
        // Busca contexto do banco
        const total = await prisma.equipamento.count();
        const inoperantes = await prisma.equipamento.count({ where: { status: 'Inoperante' } });

        const systemPrompt = `Você é o Guardião SIMEC, assistente de Engenharia Clínica. O hospital possui ${total} equipamentos cadastrados, sendo que ${inoperantes} estão parados. O usuário solicitando é ${usuarioNome}. Responda de forma curta, técnica e prestativa em Português do Brasil: ${perguntaUsuario}`;

        // Chamada direta na API V1 do Google (Evita erros de rota da biblioteca)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500
            }
        });

        // Retorna o texto extraído
        return response.data.candidates[0].content.parts[0].text;

    } catch (error) {
        // Mostra o erro detalhado no terminal para sabermos exatamente o que o google respondeu
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error("AXIOS AGENTE ERROR:", errorMessage);
        throw new Error(errorMessage);
    }
};