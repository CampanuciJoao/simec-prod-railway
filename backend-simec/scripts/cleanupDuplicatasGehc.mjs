// Limpa duplicatas de gehc_pdf_documentos criadas antes do fix de
// idempotencia por OS (bug em que o documentSearch do portal GE retornava
// documentIds rotativos para o mesmo ServReq, gerando varios registros do
// mesmo PDF logico).
//
// Estrategia: para cada (tenantId, ordemServicoId) com mais de 1 doc
// baixado, mantem o MAIS ANTIGO (createdAt asc) — esse provavelmente eh o
// que tem extracao LLM completa e ja foi sincronizado para o Knowledge
// Layer. Apaga os demais (e suas extracoes/logs em cascata via Prisma
// onDelete: Cascade do schema).
//
// Por padrao roda em DRY-RUN: lista o que faria, sem apagar nada.
// Para executar de verdade, passe `--apply`.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/cleanupDuplicatasGehc.mjs
//   DATABASE_URL=postgres://... node scripts/cleanupDuplicatasGehc.mjs --apply
//   DATABASE_URL=postgres://... node scripts/cleanupDuplicatasGehc.mjs --tenant=<uuid> --apply
//
// Implementacao usa SQL raw para nao depender do Prisma Client estar
// regenerado localmente (alguns ambientes de dev podem estar com client
// desatualizado em relacao ao schema mais recente).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const tenantArg = process.argv.find((a) => a.startsWith('--tenant='));
const TENANT_FILTRO = tenantArg ? tenantArg.slice('--tenant='.length) : null;

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (vai apagar)' : 'DRY-RUN (so lista)'}`);
  if (TENANT_FILTRO) console.log(`Tenant filtro: ${TENANT_FILTRO}`);

  // 1) Acha (tenantId, ordemServicoId) com mais de 1 doc baixado.
  const dupGroupsRows = TENANT_FILTRO
    ? await prisma.$queryRawUnsafe(
        `SELECT "tenantId", ordem_servico_id, COUNT(*)::int AS docs
           FROM gehc_pdf_documentos
          WHERE baixado_em IS NOT NULL AND "tenantId" = $1
          GROUP BY "tenantId", ordem_servico_id
         HAVING COUNT(*) > 1
          ORDER BY docs DESC`,
        TENANT_FILTRO,
      )
    : await prisma.$queryRawUnsafe(
        `SELECT "tenantId", ordem_servico_id, COUNT(*)::int AS docs
           FROM gehc_pdf_documentos
          WHERE baixado_em IS NOT NULL
          GROUP BY "tenantId", ordem_servico_id
         HAVING COUNT(*) > 1
          ORDER BY docs DESC`,
      );

  if (!dupGroupsRows.length) {
    console.log('Nenhuma OS com duplicatas encontradas. Nada a fazer.');
    return;
  }

  console.log(`OSs com duplicatas: ${dupGroupsRows.length}`);

  let totalCandidatos = 0;
  let totalRemovidos = 0;

  for (const g of dupGroupsRows) {
    const tenantId = g.tenantId;
    const ordemServicoId = g.ordem_servico_id;

    const docs = await prisma.$queryRawUnsafe(
      `SELECT id, document_id, file_name, "createdAt", baixado_em
         FROM gehc_pdf_documentos
        WHERE "tenantId" = $1 AND ordem_servico_id = $2 AND baixado_em IS NOT NULL
        ORDER BY "createdAt" ASC`,
      tenantId,
      ordemServicoId,
    );
    if (docs.length <= 1) continue;

    const manter = docs[0];
    const remover = docs.slice(1);

    console.log(
      `\nOS=${ordemServicoId} tenant=${tenantId.slice(0, 8)}…  (${docs.length} docs)`
    );
    console.log(
      `  MANTER  ${manter.document_id}  created=${manter.createdAt instanceof Date ? manter.createdAt.toISOString() : manter.createdAt}  ${(manter.file_name || '').slice(0, 70)}`
    );
    for (const d of remover) {
      console.log(
        `  REMOVER ${d.document_id}  created=${d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt}  ${(d.file_name || '').slice(0, 70)}`
      );
    }

    totalCandidatos += remover.length;

    if (APPLY) {
      // gehc_pdf_extraidos e gehc_download_logs apontando para esses ids
      // sao removidos automaticamente via onDelete: Cascade declarado no
      // schema Prisma. Embeddings derivados de eventos do KL ja gerados a
      // partir desses PDFs ficam orfaos — sao limpos no proximo run do
      // sync do Knowledge Layer (ou via reset manual). Foco aqui na
      // duplicacao real do registro do documento.
      const ids = remover.map((d) => d.id);
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      const r = await prisma.$executeRawUnsafe(
        `DELETE FROM gehc_pdf_documentos WHERE id IN (${placeholders})`,
        ...ids,
      );
      totalRemovidos += Number(r);
      console.log(`  → removidos ${r} registro(s).`);
    }
  }

  console.log('\n=== Resumo ===');
  console.log(`OSs com duplicatas:        ${dupGroupsRows.length}`);
  console.log(`Docs candidatos a remover: ${totalCandidatos}`);
  if (APPLY) {
    console.log(`Docs efetivamente removidos: ${totalRemovidos}`);
  } else {
    console.log('DRY-RUN: nada apagado. Rode de novo com --apply para executar.');
  }
}

main()
  .catch((e) => { console.error('ERRO:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
