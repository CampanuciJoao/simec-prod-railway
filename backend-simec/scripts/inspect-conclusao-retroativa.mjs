import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const oss = await prisma.osCorretiva.findMany({
  where: { status: 'Concluida', dataHoraFimEvento: null },
  select: {
    id: true, numeroOS: true,
    dataHoraAbertura: true, dataHoraConclusao: true,
    updatedAt: true, dataHoraFimEvento: true,
  },
});
const afetadas = oss.filter(o => o.dataHoraConclusao && o.dataHoraConclusao < o.dataHoraAbertura);
console.log(`Total Concluidas com FimEvento NULL: ${oss.length}`);
console.log(`Afetadas (conclusao < abertura): ${afetadas.length}`);
for (const o of afetadas) {
  console.log(`  ${o.numeroOS}: abertura=${o.dataHoraAbertura.toISOString()}, conclusao=${o.dataHoraConclusao.toISOString()}, updatedAt=${o.updatedAt.toISOString()}`);
}
await prisma.$disconnect();
