// Ficheiro: scanner-ia.js (VERSÃO ISOLADA)
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// Pega a chave direto do .env que você salvou
const API_KEY = process.env.GEMINI_API_KEY?.trim();

const modelos = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
const rotas = ["v1", "v1beta"];

async function escaneiaIA() {
    console.log("=== INICIANDO SCANNER ISOLADO ===");
    console.log("Chave lida do .env:", API_KEY ? API_KEY.substring(0, 10) + "..." : "CHAVE NÃO ENCONTRADA");

    if (!API_KEY) {
        console.log("❌ ERRO: Salve o arquivo .env com a GEMINI_API_KEY antes de rodar.");
        return;
    }

    for (const rota of rotas) {
        for (const modelo of modelos) {
            const url = `https://generativelanguage.googleapis.com/${rota}/models/${modelo}:generateContent?key=${API_KEY}`;
            try {
                process.stdout.write(`Testando: [${rota}] [${modelo}]... `);
                
                const res = await axios.post(url, {
                    contents: [{ parts: [{ text: "oi" }] }]
                }, { timeout: 5000 });

                if (res.data) {
                    console.log("\n\n✅ SUCESSO ENCONTRADO!");
                    console.log(`> ROTA: ${rota}`);
                    console.log(`> MODELO: ${modelo}`);
                    console.log(`> RESPOSTA DA IA: ${res.data.candidates[0].content.parts[0].text}`);
                    process.exit(0); 
                }
            } catch (err) {
                console.log(`❌ Falhou (${err.response?.status || "Erro"})`);
            }
        }
    }
    console.log("\n❌ NENHUMA COMBINAÇÃO FUNCIONOU.");
}

escaneiaIA();