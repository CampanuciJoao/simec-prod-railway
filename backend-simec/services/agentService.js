import axios from 'axios';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    // Rota padrão para chaves do AI Studio (v1/gemini-1.5-flash)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    try {
        const total = await prisma.equipamento.count();
        const prompt = `Você é o Guardião SIMEC. Hospital com ${total} equipamentos. Usuário: ${usuarioNome}. Responda curto: ${perguntaUsuario}`;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error("ERRO IA:", msg);
        throw new Error(msg);
    }
};