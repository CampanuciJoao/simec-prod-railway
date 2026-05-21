import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Simula a logica do endpoint /visao-global pra ver os numeros
const [tenants, eventos, embeddings, insightsAtivos, totalOs, pdfsBx, pdfsEx] = await Promise.all([
  prisma.tenant.count({ where: { ativo: true, kind: 'CUSTOMER' } }),
  prisma.eventoEquipamento.count(),
  prisma.eventoEquipamentoEmbedding.count(),
  prisma.iaInsight.count({ where: { resolvidoEm: null } }),
  prisma.gehcOrdemServico.count(),
  prisma.gehcPdfDocumento.count({ where: { baixadoEm: { not: null } } }),
  prisma.gehcPdfExtraido.count({ where: { extraidoEm: { not: null } } }),
]);
console.log('--- VISAO GLOBAL ---');
console.log({ tenants, eventos, embeddings, insightsAtivos, totalOs, pdfsBx, pdfsEx });

// Verifica por-tenant
const tenantsList = await prisma.tenant.findMany({
  where: { ativo: true, kind: 'CUSTOMER' },
  select: { id: true, nome: true, slug: true },
});
console.log('\n--- TENANTS ---');
for (const t of tenantsList) {
  const [ev, em, ins] = await Promise.all([
    prisma.eventoEquipamento.count({ where: { tenantId: t.id } }),
    prisma.eventoEquipamentoEmbedding.count({ where: { tenantId: t.id } }),
    prisma.iaInsight.count({ where: { tenantId: t.id, resolvidoEm: null } }),
  ]);
  console.log(`  ${t.slug.padEnd(20)} eventos=${ev} embeddings=${em} insightsAtivos=${ins}`);
}

await prisma.$disconnect();
