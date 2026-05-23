// Backfill de concluidoPorId / canceladoPorId em OsCorretiva a partir
// do LogAuditoria. OSs concluidas/canceladas ANTES da migration
// 20260523000001 nao tinham os FKs preenchidos. Esse script infere
// quem fez a acao olhando o log historico.
//
// Padroes do LogAuditoria (vide services/osCorretiva/index.js):
//   - Conclusao direta: entidade='OsCorretiva', detalhes contem "concluída"
//   - Cancelamento:     entidade='OsCorretiva', detalhes contem "cancelada"
//   - Conclusao via visita: entidade='VisitaTerceiro', detalhes contem "Operante"
//
// Idempotente — so atualiza onde o campo eh NULL. Pode rodar quantas vezes
// precisar. Use DRY_RUN=1 pra so listar sem aplicar.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === '1';

async function inferirConcluidoPor(os) {
  // 1. Log direto na OsCorretiva ("concluída")
  const logDireto = await prisma.logAuditoria.findFirst({
    where: {
      tenantId: os.tenantId,
      entidade: 'OsCorretiva',
      entidadeId: os.id,
      detalhes: { contains: 'concluída' },
    },
    orderBy: { timestamp: 'desc' },
    select: { autorId: true, timestamp: true },
  });
  if (logDireto?.autorId) {
    return { autorId: logDireto.autorId, fonte: 'log_direto', timestamp: logDireto.timestamp };
  }

  // 2. Log via VisitaTerceiro Operante (quando visita encerra OS)
  // Busca a visita conclusiva (resultado='Operante') desta OS
  const visita = await prisma.visitaTerceiro.findFirst({
    where: { tenantId: os.tenantId, osCorretivaId: os.id, resultado: 'Operante' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (visita) {
    const logVisita = await prisma.logAuditoria.findFirst({
      where: {
        tenantId: os.tenantId,
        entidade: 'VisitaTerceiro',
        entidadeId: visita.id,
        detalhes: { contains: 'Operante' },
      },
      orderBy: { timestamp: 'desc' },
      select: { autorId: true, timestamp: true },
    });
    if (logVisita?.autorId) {
      return { autorId: logVisita.autorId, fonte: 'log_visita', timestamp: logVisita.timestamp };
    }
  }

  return null;
}

async function inferirCanceladoPor(os) {
  const log = await prisma.logAuditoria.findFirst({
    where: {
      tenantId: os.tenantId,
      entidade: 'OsCorretiva',
      entidadeId: os.id,
      detalhes: { contains: 'cancelada' },
    },
    orderBy: { timestamp: 'desc' },
    select: { autorId: true, timestamp: true },
  });
  return log?.autorId ? { autorId: log.autorId, fonte: 'log_direto', timestamp: log.timestamp } : null;
}

async function main() {
  console.log(`=== Backfill OsCorretiva.concluidoPorId / canceladoPorId  (DRY_RUN=${DRY_RUN}) ===\n`);

  // Concluídas sem concluidoPorId
  const concluidasSemAutor = await prisma.osCorretiva.findMany({
    where: { status: 'Concluida', concluidoPorId: null },
    select: { id: true, tenantId: true, numeroOS: true, dataHoraConclusao: true },
  });
  console.log(`Concluídas sem concluidoPorId: ${concluidasSemAutor.length}`);

  let concluidasAtualizadas = 0;
  let concluidasOrfas = 0;

  for (const os of concluidasSemAutor) {
    const r = await inferirConcluidoPor(os);
    if (!r) {
      console.log(`  ORFA: ${os.numeroOS} (sem log historico)`);
      concluidasOrfas++;
      continue;
    }
    console.log(`  ${os.numeroOS}: autor=${r.autorId} (${r.fonte}, log=${r.timestamp.toISOString().slice(0,10)})`);
    if (!DRY_RUN) {
      await prisma.osCorretiva.update({
        where: { id: os.id },
        data: { concluidoPorId: r.autorId },
      });
      concluidasAtualizadas++;
    }
  }

  // Canceladas sem canceladoPorId
  const canceladasSemAutor = await prisma.osCorretiva.findMany({
    where: { status: 'Cancelada', canceladoPorId: null },
    select: { id: true, tenantId: true, numeroOS: true, dataHoraCancelamento: true },
  });
  console.log(`\nCanceladas sem canceladoPorId: ${canceladasSemAutor.length}`);

  let canceladasAtualizadas = 0;
  let canceladasOrfas = 0;

  for (const os of canceladasSemAutor) {
    const r = await inferirCanceladoPor(os);
    if (!r) {
      console.log(`  ORFA: ${os.numeroOS} (sem log historico)`);
      canceladasOrfas++;
      continue;
    }
    console.log(`  ${os.numeroOS}: autor=${r.autorId} (${r.fonte}, log=${r.timestamp.toISOString().slice(0,10)})`);
    if (!DRY_RUN) {
      await prisma.osCorretiva.update({
        where: { id: os.id },
        data: { canceladoPorId: r.autorId },
      });
      canceladasAtualizadas++;
    }
  }

  console.log(`\n=== Resumo ===`);
  console.log(`Concluidas: ${concluidasAtualizadas} atualizadas, ${concluidasOrfas} sem log (ficam null)`);
  console.log(`Canceladas: ${canceladasAtualizadas} atualizadas, ${canceladasOrfas} sem log (ficam null)`);
  if (DRY_RUN) console.log('\n(DRY_RUN — nada gravado)');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
