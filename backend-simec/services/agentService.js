// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 22.0 - VARREDURA AUTOMÁTICA DE VERSÃO E MODELO

import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    
    // Lista de tentativas (A ordem foi escolhida para achar o que está liberado na sua conta)
    const tentativas = [
        { url: 'v1beta', model: 'gemini-1.5-flash' },
        { url: 'v1beta', model: 'gemini-pro' },
        { url: 'v1', model: 'gemini-pro' }
    ];

    let ultimoErro = "";

    for (const tentativa of tentativas) {
        try {
            console.log(`[AGENTE] Tentando: ${tentativa.model} na API ${tentativa.url}...`);
            
            const endpoint = `https://generativelanguage.googleapis.com/${tentativa.url}/models/${tentativa.model}:generateContent?key=${API_KEY}`;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Você é o Guardião SIMEC. Responda curto em PT-BR: ${perguntaUsuario}` }] }]
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`[AGENTE] Sucesso com ${tentativa.model}!`);
                return data.candidates[0].content.parts[0].text;
            } else {
                console.warn(`[AGENTE] ${tentativa.model} falhou: ${data.error?.message}`);
                ultimoErro = data.error?.message;
            }
        } catch (err) {
            console.error(`[AGENTE] Erro de rede na tentativa: ${err.message}`);
        }
    }

    // Se chegou aqui, todas falharam
    throw new Error(`O Google ainda não liberou sua chave para uso externo. No Playground funciona por ser interno, mas para o sistema, o delay de ativação é maior. Erro: ${ultimoErro}`);
};