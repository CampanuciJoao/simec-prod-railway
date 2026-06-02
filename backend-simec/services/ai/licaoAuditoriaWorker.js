// Worker semanal de auditoria de licoes cross-tenant.
//
// Por que existe: o detector adversarial roda sincrono na CRIACAO de
// cada licao. Mas:
//   - Licoes criadas antes do G3 nunca foram auditadas
//   - Quando melhoramos o detector (nova regra, nova lista), licoes
//     antigas que escapavam podem agora ser flagadas
//   - Quero feedback loop: ver quais padroes mais aparecem pra
//     evoluir o detector
//
// Estrategia: roda em todas as licoes ativas/limpas que NUNCA foram
// re-auditadas OU cuja ultima auditoria foi >7 dias atras. Marca novas
// suspeitas como QUARENTENA + ativa=false + grava trilha.
//
// Idempotente: pode rodar varias vezes; nao re-processa o que ja foi
// auditado recentemente.

import prisma from '../prismaService.js';
import { detectarPadroesSuspeitos } from './licaoAnonimizacaoAuditor.js';

const DIAS_ENTRE_AUDITORIAS = 7;

export async function auditarLicoesPeriodicamente({ limite = 500 } = {}) {
  const cutoff = new Date(
    Date.now() - DIAS_ENTRE_AUDITORIAS * 24 * 60 * 60 * 1000
  );

  // Pega licoes APROVADAS que nao foram auditadas recentemente. Quarentenadas
  // ja estao paradas — nao re-auditar. Rejeitadas tambem pular.
  const candidatas = await prisma.iaCategoriaLicao.findMany({
    where: {
      status: 'APROVADA',
      OR: [
        { ultimaAuditoriaEm: null },
        { ultimaAuditoriaEm: { lt: cutoff } },
      ],
    },
    take: limite,
    orderBy: [{ ultimaAuditoriaEm: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      textoDespersonalizado: true,
    },
  });

  if (!candidatas.length) {
    return { processadas: 0, novasSuspeitas: 0 };
  }

  console.log(`[LICAO_AUDIT] Auditando ${candidatas.length} licoes...`);

  let novasSuspeitas = 0;

  for (const licao of candidatas) {
    const r = detectarPadroesSuspeitos(licao.textoDespersonalizado);
    const agora = new Date();

    if (r.suspeita) {
      // Move pra QUARENTENA e registra trilha
      await prisma.$transaction([
        prisma.iaCategoriaLicao.update({
          where: { id: licao.id },
          data: {
            status: 'QUARENTENA',
            ativa: false,
            ultimaAuditoriaEm: agora,
          },
        }),
        prisma.iaLicaoAuditoria.create({
          data: {
            licaoId: licao.id,
            resultado: 'suspeita',
            padroes: r.padroes,
            trecho: r.trecho,
            origem: 'job_semanal',
          },
        }),
      ]);
      novasSuspeitas += 1;
      console.warn(
        `[LICAO_AUDIT] QUARENTENADA id=${licao.id} padroes=${r.padroes.join(',')}`
      );
    } else {
      // Atualiza so o timestamp de auditoria — passou limpa
      await prisma.iaCategoriaLicao.update({
        where: { id: licao.id },
        data: { ultimaAuditoriaEm: agora },
      });
    }
  }

  console.log(
    `[LICAO_AUDIT] Concluido. ${candidatas.length} processadas, ${novasSuspeitas} novas QUARENTENA.`
  );
  return { processadas: candidatas.length, novasSuspeitas };
}

// Util pra responder "quais licoes vieram de labels do tenant X?" — usa
// o labelHash pra fazer cross-reference sem quebrar despersonalizacao.
// Em caso de incidente / pedido LGPD de cliente, eh aqui que se rastreia.
import crypto from 'node:crypto';
const LICAO_HASH_SALT = process.env.IA_LICAO_HASH_SALT || 'simec-ia-licao-v1';

export async function rastrearLicoesDoTenant(tenantId) {
  const labels = await prisma.iaCategoriaLabel.findMany({
    where: { tenantId },
    select: { id: true },
  });

  if (!labels.length) return [];

  const hashes = labels.map((l) =>
    crypto.createHash('sha256').update(`${LICAO_HASH_SALT}:${l.id}`).digest('hex')
  );

  return prisma.iaCategoriaLicao.findMany({
    where: { labelHash: { in: hashes } },
    select: {
      id: true,
      textoDespersonalizado: true,
      categoriaCorreta: true,
      status: true,
      ativa: true,
      vezesAplicada: true,
      createdAt: true,
    },
  });
}
