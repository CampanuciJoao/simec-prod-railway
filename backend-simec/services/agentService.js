import axios from 'axios';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    // 1. Limpeza rigorosa da chave
    const API_KEY = process.env.GEMINI_API_KEY?.replace(/['" ]/g, '').trim();

    if (!API_KEY) throw new Error("Chave GEMINI_API_KEY não configurada.");

    // 2. Busca contexto do banco
    let contexto = "";
    try {
        const total = await prisma.equipamento.count();
        contexto = `Temos ${total} aparelhos no total.`;
    } catch (e) { contexto = "Sistema online."; }

    const prompt = `Você é o Guardião SIMEC. ${contexto} Usuário: ${usuarioNome}. Pergunta: ${perguntaUsuario}`;

    // 3. LISTA DE TENTATIVAS (A Rota 1 é a correta para sua nova chave)
    const tentativas = [
        {
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            nome: "v1beta-Flash"
        },
        {
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
            nome: "v1-GeminiPro"
        }
    ];

    let ultimoErro = "";

    for (const tentativa of tentativas) {
        try {
            console.log(`[AGENTE] Tentando conexão via ${tentativa.nome}...`);
            
            const response = await axios.post(tentativa.url, {
                contents: [{ parts: [{ text: prompt }] }]
            }, { timeout: 10000 });

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.log(`✅ SUCESSO com ${tentativa.nome}!`);
                return response.data.candidates[0].content.parts[0].text;
            }
        } catch (error) {
            ultimoErro = error.response?.data?.error?.message || error.message;
            console.warn(`[AGENTE] Falha na rota ${tentativa.nome}: ${ultimoErro}`);
        }
    }

    // 4. SE CHEGOU AQUI, TODAS AS ROTAS DO GOOGLE FALHARAM
    throw new Error(`Google AI indisponível. Erro: ${ultimoErro}`);
};