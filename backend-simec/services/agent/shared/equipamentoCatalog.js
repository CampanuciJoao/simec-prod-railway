// Catalogo compacto de equipamentos do tenant, cacheado em memoria por
// 5 minutos. Usado APENAS pelo InterpretationAgent pra alimentar o LLM
// com a lista de modelos/tags/unidades cadastrados — permite fuzzy match
// inteligente de apelidos parciais ("Tomografia Evo" -> "Revolution Evo")
// no momento da interpretacao, antes de virar sessao.
//
// Cache:
//  - Em memoria do worker/server (cada processo tem o seu — ok aqui,
//    catalogo eh estavel e dados nao sao sensiveis).
//  - TTL 5 minutos: trade-off entre fresh data e custo de query a cada
//    msg do chat. Equipamento novo cadastrado aparece na proxima janela.
//  - Invalidacao manual via `invalidarCatalogoTenant(tenantId)` quando
//    quisermos forcar refresh (ex: hook pos-criar-equipamento).
//
// Tamanho: limitado a 80 equipamentos (cobre o cliente atual e qualquer
// cenario de 200-500 ativos onde so os mais relevantes entram). Equipamento
// fora desse top continua sendo resolvido pelo entityResolver em sessao —
// o catalogo eh otimizacao de "linha 1" do funil, nao verdade absoluta.

import prisma from '../../prismaService.js';

const TTL_MS = 5 * 60 * 1000;
const MAX_EQUIPAMENTOS = 80;

const cache = new Map(); // tenantId -> { catalogo, expiraEm }

function formatarLinhaCatalogo(eq) {
  const partes = [eq.modelo];
  if (eq.tipo) partes.push(eq.tipo);
  if (eq.tag) partes.push(`TAG ${eq.tag}`);
  if (eq.unidade?.nomeSistema) partes.push(eq.unidade.nomeSistema);
  return partes.join(' | ');
}

async function carregarCatalogoDoBanco(tenantId) {
  const equipamentos = await prisma.equipamento.findMany({
    where: { tenantId },
    select: {
      id: true,
      modelo: true,
      tag: true,
      tipo: true,
      unidade: {
        select: { nomeSistema: true },
      },
    },
    orderBy: [{ modelo: 'asc' }],
    take: MAX_EQUIPAMENTOS,
  });

  return equipamentos.map(formatarLinhaCatalogo);
}

export async function getCatalogoEquipamentos(tenantId) {
  if (!tenantId) return [];

  const agora = Date.now();
  const entrada = cache.get(tenantId);
  if (entrada && entrada.expiraEm > agora) {
    return entrada.catalogo;
  }

  try {
    const catalogo = await carregarCatalogoDoBanco(tenantId);
    cache.set(tenantId, { catalogo, expiraEm: agora + TTL_MS });
    return catalogo;
  } catch (err) {
    console.warn('[CATALOG] Falha ao carregar catalogo, devolvendo vazio:', err.message);
    return [];
  }
}

export function invalidarCatalogoTenant(tenantId) {
  if (tenantId) cache.delete(tenantId);
}

// Util pra testes — limpa cache global
export function _resetCatalogoCache() {
  cache.clear();
}
