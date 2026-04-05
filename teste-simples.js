import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listar() {
  const models = await genAI.listModels();
  console.log("=== MODELOS DISPONÍVEIS NA SUA CONTA ===");
  models.models.forEach(m => console.log(`Nome: ${m.name} | Visão: ${m.supportedGenerationMethods}`));
}
listar();