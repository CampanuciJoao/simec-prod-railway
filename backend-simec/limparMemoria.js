import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function limpar() {
  console.log("Limpando histórico de chat...");
  await prisma.chatHistorico.deleteMany({});
  console.log("Histórico limpo com sucesso!");
  process.exit();
}

limpar();