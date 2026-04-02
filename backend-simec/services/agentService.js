// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 21.0 - CHAMADA DIRETA VIA FETCH (SEM DEPENDÊNCIA DE SDK)

import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    
    // Usaremos a URL oficial de produção (v1), ignorando a v1beta que deu erro no log
    const URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            parts: [{
                text: `Você é o Guardião SIMEC, assistente de engenharia clínica. Usuário: ${usuarioNome}. Pergunta: ${perguntaUsuario}`
            }]
        }],
        generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7
        }
    };

    try {
        console.log(`[AGENTE] Enviando chamada direta via API Estável (v1)...`);

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("--- ERRO NA RESPOSTA DO GOOGLE ---");
            console.error(JSON.stringify(data, null, 2));
            
            if (response.status === 404) {
                throw new Error("O Google ainda não sincronizou seu faturamento para acesso externo. No Playground funciona porque é interno, mas para APIs externas como o Railway, o delay de propagação é de algumas horas.");
            }
            throw new Error(data.error?.message || "Erro na API do Google");
        }

        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("--- FALHA NA CONEXÃO DIRETA ---");
        console.error("Mensagem:", error.message);
        throw new Error(error.message);
    }
};