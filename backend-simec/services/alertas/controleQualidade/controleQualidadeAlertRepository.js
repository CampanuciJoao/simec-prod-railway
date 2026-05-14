// Repository de alertas de Controle de Qualidade.
// Padrao identico ao contratoAlertRepository (upsert com diff de mudanca).

import prisma from '../../prismaService.js';

function alertaMudou(existente, data) {
  return (
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.prioridade !== data.prioridade ||
    String(existente.data) !== String(data.data) ||
    existente.tipo !== data.tipo ||
    existente.tipoCategoria !== data.tipoCategoria ||
    existente.tipoEvento !== data.tipoEvento ||
    existente.link !== data.link
  );
}

// Retorna o "vencimento ativo" por (equipamento, tipoTeste): registro com
// maior dataExecucao no tenant. Pula deletados e fantasmas (sem dataExecucao,
// que tambem entram com proximoVencimento mas nao tem resultado ainda).
export async function buscarVencimentosAtivosPorTenant(tenantId) {
  // SQL puro pra usar DISTINCT ON (mais barato que processar em JS)
  return prisma.$queryRaw`
    SELECT DISTINCT ON ("tipo_teste_id", "equipamento_id")
      tq."id",
      tq."tenantId",
      tq."equipamento_id"   AS "equipamentoId",
      tq."tipo_teste_id"    AS "tipoTesteId",
      tq."data_execucao"    AS "dataExecucao",
      tq."proximo_vencimento" AS "proximoVencimento",
      tq."resultado",
      tq."pendencias_acao"  AS "pendenciasAcao",
      tt."codigo"           AS "tipoTesteCodigo",
      tt."nome"             AS "tipoTesteNome",
      tt."modalidade"       AS "tipoTesteModalidade",
      tt."obrigatorio"      AS "tipoTesteObrigatorio",
      eq."tag"              AS "equipamentoTag",
      eq."apelido"          AS "equipamentoApelido",
      eq."modelo"           AS "equipamentoModelo",
      eq."status"           AS "equipamentoStatus"
    FROM "testes_qualidade" tq
    INNER JOIN "tipos_testes_qualidade" tt ON tt."id" = tq."tipo_teste_id"
    INNER JOIN "equipamentos" eq ON eq."id" = tq."equipamento_id"
    WHERE tq."tenantId" = ${tenantId}
      AND tq."deletado_em" IS NULL
      AND tq."proximo_vencimento" IS NOT NULL
      AND eq."status" NOT IN ('Vendido', 'Desativado')
    ORDER BY "tipo_teste_id", "equipamento_id", tq."data_execucao" DESC NULLS LAST, tq."createdAt" DESC
  `;
}

export async function upsertAlertaCQ(tenantId, alertaId, data) {
  const existente = await prisma.alerta.findFirst({
    where: { id: alertaId, tenantId },
    select: {
      titulo: true,
      subtitulo: true,
      prioridade: true,
      data: true,
      tipo: true,
      tipoCategoria: true,
      tipoEvento: true,
      link: true,
    },
  });

  if (!existente) {
    await prisma.alerta.create({
      data: { tenantId, id: alertaId, ...data },
    });
    return { created: true, updated: false };
  }

  if (!alertaMudou(existente, data)) {
    return { created: false, updated: false };
  }

  await prisma.alerta.update({
    where: { id: alertaId },
    data: { tenantId, ...data },
  });

  return { created: false, updated: true };
}

// Remove alertas CQ orfaos: testes deletados, equipamentos vendidos, ou
// testes que ja tem renovacao mais recente.
export async function removerAlertasOrfaos(tenantId, alertaIdsAtivos) {
  await prisma.alerta.deleteMany({
    where: {
      tenantId,
      tipoCategoria: 'CONTROLE_QUALIDADE',
      ...(alertaIdsAtivos.length > 0 ? { id: { notIn: alertaIdsAtivos } } : {}),
    },
  });
}
