// Relatorio para ORCAMENTO de Controle de Qualidade — lista equipamentos
// das modalidades reguladas/recomendadas (RDC 611/2022) com os campos
// necessarios pra cotacao: modalidade, modelo, fabricante, TAG (numero
// de serie no sistema), unidade e CNPJ.
//
// Diferenca do conformidadeCqPdfService:
//   - conformidade  : foca em status atual dos testes ja executados
//   - orcamento     : foca em INVENTARIO dos equipamentos a serem cotados
//
// Filtros suportados:
//   - unidadeIds: array opcional. Vazio = todas as unidades do tenant.
//   - modalidades: array opcional. Vazio = todas as MODALIDADES_COM_CQ.
//
// Ordenacao: agrupa por unidade -> modalidade -> modelo, pra facilitar
// leitura pelo prestador que vai cotar.

import prisma from '../prismaService.js';
import { buildWhereModalidadeCq } from '../controleQualidade/modalidadesCqMatcher.js';

const MAX_EQUIPAMENTOS = 500; // teto defensivo — orcamento real raro passa de 100

export async function obterDadosPdfOrcamentoCq({
  tenantId,
  unidadeIds = null,
  modalidades = null,
}) {
  // Filtro de modalidade: ou usa lista explicita (string match exato)
  // ou usa o matcher robusto que cobre variacoes de cadastro
  // (Mamografo/Mamografia, com/sem acento, DR/Raio-X, etc).
  const filtroModalidade =
    Array.isArray(modalidades) && modalidades.length > 0
      ? { tipo: { in: modalidades } }
      : buildWhereModalidadeCq();

  const whereEquipamento = {
    tenantId,
    ...filtroModalidade,
    status: { notIn: ['Vendido', 'Desativado'] },
  };
  if (Array.isArray(unidadeIds) && unidadeIds.length > 0) {
    whereEquipamento.unidadeId = { in: unidadeIds };
  }

  const equipamentos = await prisma.equipamento.findMany({
    where: whereEquipamento,
    select: {
      id: true,
      tag: true,
      modelo: true,
      fabricante: true,
      tipo: true,
      anoFabricacao: true,
      unidade: {
        select: {
          id: true,
          nomeSistema: true,
          nomeFantasia: true,
          cnpj: true,
          cidade: true,
          estado: true,
        },
      },
    },
    orderBy: [{ unidade: { nomeSistema: 'asc' } }, { tipo: 'asc' }, { modelo: 'asc' }],
    take: MAX_EQUIPAMENTOS,
  });

  // Agrupa por unidade preservando ordem
  const porUnidade = new Map();
  for (const eq of equipamentos) {
    const u = eq.unidade;
    const chave = u?.id || 'sem-unidade';
    if (!porUnidade.has(chave)) {
      porUnidade.set(chave, {
        unidade: u || { nomeSistema: 'Sem unidade', cnpj: null },
        equipamentos: [],
      });
    }
    porUnidade.get(chave).equipamentos.push({
      tipo: eq.tipo,
      modelo: eq.modelo,
      fabricante: eq.fabricante || '—',
      numeroSerie: eq.tag || '—', // por decisao do produto, TAG = nº de serie
      anoFabricacao: eq.anoFabricacao || null,
    });
  }

  // Distribuicao por modalidade (resumo executivo)
  const porModalidade = new Map();
  for (const eq of equipamentos) {
    porModalidade.set(eq.tipo, (porModalidade.get(eq.tipo) || 0) + 1);
  }

  return {
    emitidoEm: new Date(),
    resumo: {
      totalEquipamentos: equipamentos.length,
      totalUnidades: porUnidade.size,
      distribuicaoModalidade: [...porModalidade.entries()]
        .map(([modalidade, qtd]) => ({ modalidade, quantidade: qtd }))
        .sort((a, b) => b.quantidade - a.quantidade),
      truncado: equipamentos.length === MAX_EQUIPAMENTOS,
    },
    unidades: [...porUnidade.values()],
    modalidadesFiltradas: Array.isArray(modalidades) && modalidades.length > 0 ? modalidades : 'matcher_padrao',
  };
}
