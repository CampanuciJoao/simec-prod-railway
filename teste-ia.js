import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testar() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testando chave:", key.substring(0, 10) + "...");

    // Rota V1BETA com o nome completo do modelo
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

    try {
        const res = await axios.post(url, {
            contents: [{ parts: [{ text: "Responda apenas: SISTEMA OK" }] }]
        });
        console.log("RESPOSTA DO GOOGLE:", res.data.candidates[0].content.parts[0].text);
    } catch (err) {
        console.log("ERRO DETALHADO:");
        console.log("Status:", err.response?.status);
        console.log("Mensagem:", err.response?.data?.error?.message || err.message);
    }
}

testar();