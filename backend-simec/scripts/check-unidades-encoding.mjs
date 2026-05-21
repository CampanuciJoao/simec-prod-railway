import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const us = await prisma.unidade.findMany({
  select: { id: true, nomeSistema: true, nomeFantasia: true, cnpj: true, cidade: true, estado: true, logradouro: true, numero: true, complemento: true },
});
for (const u of us) {
  console.log(`UNIDADE ${u.cnpj} (${u.cidade}/${u.estado})`);
  console.log(`  fantasia : "${u.nomeFantasia}"`);
  console.log(`  hex      : ${[...(u.nomeFantasia||'')].map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join(' ')}`);
  console.log(`  logradouro: "${u.logradouro}"`);
}
await prisma.$disconnect();
