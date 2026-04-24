import prisma from './prismaService.js';

const INCLUDE_COMPLETO = {
  criadoPor:   { select: { id: true, nome: true, email: true } },
  aprovadoPor: { select: { id: true, nome: true, email: true } },
  unidade:     { select: { id: true, nomeSistema: true, nomeFantasia: true } },
  fornecedores: {
    orderBy: { ordem: 'asc' },
    include: { precos: true },
  },
  itens: {
    orderBy: { ordem: 'asc' },
    include: { precos: true },
  },
};

export async function listarOrcamentos({ tenantId, status, tipo }) {
  const where = { tenantId };
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;

  return prisma.orcamento.findMany({
    where,
    include: {
      criadoPor: { select: { id: true, nome: true } },
      aprovadoPor: { select: { id: true, nome: true } },
      unidade: { select: { id: true, nomeSistema: true, nomeFantasia: true } },
      fornecedores: { select: { id: true, nome: true, ordem: true } },
      itens: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function buscarOrcamentoPorId({ tenantId, id }) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, tenantId },
    include: INCLUDE_COMPLETO,
  });

  if (!orcamento) {
    const err = new Error('Orçamento não encontrado.');
    err.status = 404;
    throw err;
  }

  return orcamento;
}

export async function criarOrcamento({ tenantId, criadoPorId, dados }) {
  const { titulo, tipo, observacao, unidadeId, fornecedores, itens } = dados;

  return prisma.$transaction(async (tx) => {
    const orcamento = await tx.orcamento.create({
      data: {
        tenantId,
        criadoPorId,
        titulo,
        tipo,
        observacao,
        unidadeId: unidadeId || null,
      },
    });

    const fornecedoresCriados = await Promise.all(
      fornecedores.map((f) =>
        tx.orcamentoFornecedor.create({
          data: {
            orcamentoId: orcamento.id,
            nome: f.nome,
            formaPagamento: f.formaPagamento || null,
            ordem: f.ordem,
          },
        })
      )
    );

    const fornecedorMap = {};
    fornecedores.forEach((f, i) => {
      fornecedorMap[f.id || `_idx_${i}`] = fornecedoresCriados[i].id;
    });

    for (const item of itens) {
      const itemCriado = await tx.orcamentoItem.create({
        data: {
          orcamentoId: orcamento.id,
          descricao: item.descricao,
          data: item.data ? new Date(item.data) : null,
          ordem: item.ordem,
          isDestaque: item.isDestaque || false,
        },
      });

      if (item.precos) {
        for (const [fornecedorKey, preco] of Object.entries(item.precos)) {
          const fornecedorId = fornecedorMap[fornecedorKey];
          if (!fornecedorId) continue;

          await tx.orcamentoItemPreco.create({
            data: {
              itemId: itemCriado.id,
              fornecedorId,
              valor: preco.valor || 0,
              desconto: preco.desconto || 0,
            },
          });
        }
      }
    }

    // FIX: usar tx (não prisma) para ler dentro da transação
    return tx.orcamento.findFirst({
      where: { id: orcamento.id },
      include: INCLUDE_COMPLETO,
    });
  });
}

export async function atualizarOrcamento({ tenantId, id, dados }) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, tenantId },
  });

  if (!orcamento) {
    const err = new Error('Orçamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (orcamento.status !== 'RASCUNHO') {
    const err = new Error('Apenas orçamentos em rascunho podem ser editados.');
    err.status = 400;
    throw err;
  }

  const { titulo, tipo, observacao, unidadeId, fornecedores, itens } = dados;

  return prisma.$transaction(async (tx) => {
    await tx.orcamento.update({
      where: { id },
      data: { titulo, tipo, observacao, unidadeId: unidadeId || null },
    });

    await tx.orcamentoFornecedor.deleteMany({ where: { orcamentoId: id } });
    await tx.orcamentoItem.deleteMany({ where: { orcamentoId: id } });

    const fornecedoresCriados = await Promise.all(
      fornecedores.map((f) =>
        tx.orcamentoFornecedor.create({
          data: {
            orcamentoId: id,
            nome: f.nome,
            formaPagamento: f.formaPagamento || null,
            ordem: f.ordem,
          },
        })
      )
    );

    const fornecedorMap = {};
    fornecedores.forEach((f, i) => {
      fornecedorMap[f.id || `_idx_${i}`] = fornecedoresCriados[i].id;
    });

    for (const item of itens) {
      const itemCriado = await tx.orcamentoItem.create({
        data: {
          orcamentoId: id,
          descricao: item.descricao,
          data: item.data ? new Date(item.data) : null,
          ordem: item.ordem,
          isDestaque: item.isDestaque || false,
        },
      });

      if (item.precos) {
        for (const [fornecedorKey, preco] of Object.entries(item.precos)) {
          const fornecedorId = fornecedorMap[fornecedorKey];
          if (!fornecedorId) continue;

          await tx.orcamentoItemPreco.create({
            data: {
              itemId: itemCriado.id,
              fornecedorId,
              valor: preco.valor || 0,
              desconto: preco.desconto || 0,
            },
          });
        }
      }
    }

    // FIX: usar tx (não prisma) para ler dentro da transação
    return tx.orcamento.findFirst({
      where: { id },
      include: INCLUDE_COMPLETO,
    });
  });
}

export async function excluirOrcamento({ tenantId, id }) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, tenantId },
  });

  if (!orcamento) {
    const err = new Error('Orçamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (orcamento.status !== 'RASCUNHO') {
    const err = new Error('Apenas orçamentos em rascunho podem ser excluídos.');
    err.status = 400;
    throw err;
  }

  await prisma.orcamento.delete({ where: { id } });
}

export async function enviarParaAprovacao({ tenantId, id }) {
  const orcamento = await prisma.orcamento.findFirst({ where: { id, tenantId } });

  if (!orcamento) {
    const err = new Error('Orçamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (orcamento.status !== 'RASCUNHO') {
    const err = new Error('Apenas rascunhos podem ser enviados para aprovação.');
    err.status = 400;
    throw err;
  }

  return prisma.orcamento.update({
    where: { id },
    data: { status: 'PENDENTE' },
    include: INCLUDE_COMPLETO,
  });
}

export async function aprovarOrcamento({ tenantId, id, aprovadoPorId, fornecedorAprovadoId }) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, tenantId },
    include: { fornecedores: { select: { id: true } } },
  });

  if (!orcamento) {
    const err = new Error('Orçamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (orcamento.status !== 'PENDENTE') {
    const err = new Error('Apenas orçamentos pendentes podem ser aprovados.');
    err.status = 400;
    throw err;
  }

  if (fornecedorAprovadoId) {
    const pertence = orcamento.fornecedores.some((f) => f.id === fornecedorAprovadoId);
    if (!pertence) {
      const err = new Error('Fornecedor selecionado não pertence a este orçamento.');
      err.status = 400;
      throw err;
    }
  }

  return prisma.orcamento.update({
    where: { id },
    data: {
      status: 'APROVADO',
      aprovadoPorId,
      fornecedorAprovadoId: fornecedorAprovadoId || null,
      dataAprovacao: new Date(),
    },
    include: INCLUDE_COMPLETO,
  });
}

export async function rejeitarOrcamento({ tenantId, id, aprovadoPorId, motivoRejeicao }) {
  const orcamento = await prisma.orcamento.findFirst({ where: { id, tenantId } });

  if (!orcamento) {
    const err = new Error('Orçamento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (orcamento.status !== 'PENDENTE') {
    const err = new Error('Apenas orçamentos pendentes podem ser rejeitados.');
    err.status = 400;
    throw err;
  }

  return prisma.orcamento.update({
    where: { id },
    data: { status: 'REJEITADO', aprovadoPorId, motivoRejeicao, dataAprovacao: new Date() },
    include: INCLUDE_COMPLETO,
  });
}

export async function obterMetricasOrcamentos({ tenantId }) {
  const [total, porStatus] = await Promise.all([
    prisma.orcamento.count({ where: { tenantId } }),
    prisma.orcamento.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
  ]);

  const contagens = { RASCUNHO: 0, PENDENTE: 0, APROVADO: 0, REJEITADO: 0 };
  for (const row of porStatus) {
    contagens[row.status] = row._count.id;
  }

  return { total, ...contagens };
}
