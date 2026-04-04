import axios from 'axios';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!API_KEY) throw new Error("API_KEY não configurada.");

    try {
        // Busca contexto do banco
        const total = await prisma.equipamento.count();
        const inoperantes = await prisma.equipamento.count({ where: { status: 'Inoperante' } });

        const systemPrompt = `Você é o Guardião SIMEC, assistente de Engenharia Clínica. O hospital possui ${total} equipamentos cadastrados, sendo que ${inoperantes} estão parados. O usuário solicitando é ${usuarioNome}. Responda de forma curta, técnica e prestativa em Português do Brasil: ${perguntaUsuario}`;

        // MUDANÇA CRUCIAL: Usando 'gemini-pro' (versão 1.0 estável) na rota v1
        // Este modelo é o mais aceito universalmente pelo Google.
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

        console.log("[AGENTE] Chamando gemini-pro na rota v1...");

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500
            }
        });

        return response.data.candidates[0].content.parts[0].text;

    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error("AXIOS AGENTE ERROR:", errorMessage);
        throw new Error(errorMessage);
    }
};