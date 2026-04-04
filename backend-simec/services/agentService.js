// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 28.0 - BYPASS TOTAL DO SDK (CHAMADA DIRETA V1 ESTÁVEL)

import axios from 'axios';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!API_KEY) throw new Error("API_KEY não configurada no Railway.");

    try {
        // 1. Busca contexto do banco (Opcional, mas mantém a inteligência)
        const total = await prisma.equipamento.count();
        const inoperantes = await prisma.equipamento.count({ where: { status: 'Inoperante' } });

        const promptLocal = `Você é o Guardião SIMEC. O hospital tem ${total} aparelhos, ${inoperantes} parados. Usuário: ${usuarioNome}. Responda curto: ${perguntaUsuario}`;

        // 2. A ROTA MANUAL PARA A API ESTÁVEL (V1)
        // Isso ignora o 'v1beta' que estava dando erro 404
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        console.log("[AGENTE] Chamando API V1 Estável via Axios...");

        const response = await axios.post(url, {
            contents: [
                {
                    parts: [{ text: promptLocal }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 400
            }
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        // 3. Extração da resposta do formato padrão do Google
        const textoResposta = response.data.candidates[0].content.parts[0].text;

        if (!textoResposta) throw new Error("O Google retornou uma resposta vazia.");

        return textoResposta;

    } catch (error) {
        // Log detalhado para você ver no Railway se algo der errado
        const erroMsg = error.response?.data?.error?.message || error.message;
        console.error(`[ERRO_API_DIRETA]:`, erroMsg);

        if (erroMsg.includes("API key not valid")) {
            throw new Error("Sua chave de API parece estar incorreta no Railway.");
        }

        throw new Error(`Erro na IA (V1): ${erroMsg}`);
    }
};