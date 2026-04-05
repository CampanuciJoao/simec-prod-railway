import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testar() {
  try {
    // Tente este modelo específico
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Diga 'Olá, sistema online'");
    console.log("✅ SUCESSO! O modelo respondeu:", result.response.text());
  } catch (error) {
    console.error("❌ FALHA AO USAR BIBLIOTECA OFICIAL:", error.message);
  }
}
testar();