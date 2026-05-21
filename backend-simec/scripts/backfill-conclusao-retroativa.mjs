import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

const oss = await prisma.osCorretiva.findMany({
  where: { status: 'Concluida', dataHoraFimEvento: null },
  select: { id: true, numeroOS: true, dataHoraAbertura: true, dataHoraConclusao: true, updatedAt: true },
});
const afetadas = oss.filter(o => o.dataHoraConclusao && o.dataHoraConclusao < o.dataHoraAbertura);
console.log(`Encontradas ${afetadas.length} OS(s) para corrigir. DRY_RUN=${DRY_RUN}`);

for (const o of afetadas) {
  console.log(`\n${o.numeroOS}:`);
  console.log(`  ANTES: conclusao=${o.dataHoraConclusao.toISOString()}, fimEvento=NULL`);
  console.log(`  DEPOIS: conclusao=${o.updatedAt.toISOString()}, fimEvento=${o.dataHoraConclusao.toISOString()}`);
  if (!DRY_RUN) {
    await prisma.osCorretiva.update({
      where: { id: o.id },
      data: {
        dataHoraFimEvento: o.dataHoraConclusao,
        dataHoraConclusao: o.updatedAt,
      },
    });
    console.log(`  -> aplicado`);
  }
}
await prisma.$disconnect();
