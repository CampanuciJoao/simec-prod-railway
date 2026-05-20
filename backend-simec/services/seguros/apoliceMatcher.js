// services/seguros/apoliceMatcher.js
// Casa dados extraídos da apólice com entidades cadastradas no SIMEC.
// Sempre escopado por tenantId — multi-tenant safe.

import prisma from '../prismaService.js';

// ─── Helpers (exportados para testes) ───────────────────────────────────────
export function normalizarCep(cep) {
  if (!cep) return null;
  const digitos = String(cep).replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ─── Match de Unidade por endereço ──────────────────────────────────────────
export async function casarUnidade(tenantId, localRisco) {
  if (!localRisco) return { unidadeId: null, candidatos: [] };

  const cepNormalizado = normalizarCep(localRisco.cep);

  // Tentativa 1: CEP + número exatos (match mais forte)
  if (cepNormalizado && localRisco.numero) {
    const match = await prisma.unidade.findFirst({
      where: {
        tenantId,
        cep: cepNormalizado,
        numero: String(localRisco.numero),
      },
      select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true },
    });

    if (match) {
      return { unidadeId: match.id, candidatos: [match], confianca: 'alta' };
    }
  }

  // Tentativa 2: só CEP
  if (cepNormalizado) {
    const matches = await prisma.unidade.findMany({
      where: { tenantId, cep: cepNormalizado },
      select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true },
      take: 5,
    });

    if (matches.length === 1) {
      return { unidadeId: matches[0].id, candidatos: matches, confianca: 'media' };
    }
    if (matches.length > 1) {
      return { unidadeId: null, candidatos: matches, confianca: 'ambigua' };
    }
  }

  // Tentativa 3: fuzzy por cidade + logradouro
  if (localRisco.cidade && localRisco.logradouro) {
    const cidadeNorm = normalizarTexto(localRisco.cidade);

    // Pega primeiras 2 palavras significativas do logradouro
    const palavrasLogradouro = normalizarTexto(localRisco.logradouro)
      .split(/\s+/)
      .filter((p) => p.length > 3 && !['rua', 'avenida', 'av', 'travessa', 'alameda', 'praca'].includes(p))
      .slice(0, 2);

    if (palavrasLogradouro.length > 0) {
      const candidatos = await prisma.unidade.findMany({
        where: {
          tenantId,
          AND: [
            { cidade: { contains: cidadeNorm, mode: 'insensitive' } },
            {
              OR: palavrasLogradouro.map((p) => ({
                logradouro: { contains: p, mode: 'insensitive' },
              })),
            },
          ],
        },
        select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true, logradouro: true },
        take: 5,
      });

      if (candidatos.length === 1) {
        return { unidadeId: candidatos[0].id, candidatos, confianca: 'baixa' };
      }
      if (candidatos.length > 1) {
        return { unidadeId: null, candidatos, confianca: 'ambigua' };
      }
    }
  }

  // Tentativa 4: só por cidade (último recurso, alta ambiguidade)
  if (localRisco.cidade) {
    const candidatos = await prisma.unidade.findMany({
      where: {
        tenantId,
        cidade: { contains: normalizarTexto(localRisco.cidade), mode: 'insensitive' },
      },
      select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true },
      take: 5,
    });

    return {
      unidadeId: candidatos.length === 1 ? candidatos[0].id : null,
      candidatos,
      confianca: candidatos.length === 1 ? 'baixa' : 'ambigua',
    };
  }

  return { unidadeId: null, candidatos: [], confianca: 'nenhuma' };
}

// ─── Match de Equipamento por TAG (número de série no SIMEC) ────────────────
export async function casarEquipamento(tenantId, bens, unidadeId = null) {
  if (!Array.isArray(bens) || bens.length === 0) {
    return { equipamentoId: null, candidatos: [] };
  }

  // Coleta todas as séries dos bens (numeroSerie tem prioridade, depois chassi)
  const series = bens
    .map((b) => b?.numeroSerie || b?.chassi)
    .filter(Boolean)
    .map((s) => String(s).trim());

  if (series.length === 0) {
    return { equipamentoId: null, candidatos: [] };
  }

  // Busca por tag exata (case-insensitive) entre todas as séries do PDF
  const candidatos = await prisma.equipamento.findMany({
    where: {
      tenantId,
      OR: series.map((s) => ({ tag: { equals: s, mode: 'insensitive' } })),
    },
    select: {
      id: true,
      tag: true,
      modelo: true,
      fabricante: true,
      unidadeId: true,
      unidade: { select: { id: true, nomeSistema: true } },
    },
    take: 10,
  });

  if (candidatos.length === 0) {
    return { equipamentoId: null, candidatos: [] };
  }

  // Se temos unidade sugerida, prioriza equipamento dessa unidade
  if (unidadeId) {
    const naUnidade = candidatos.find((c) => c.unidadeId === unidadeId);
    if (naUnidade) {
      return { equipamentoId: naUnidade.id, candidatos };
    }
  }

  // Único candidato — match direto
  if (candidatos.length === 1) {
    return { equipamentoId: candidatos[0].id, candidatos };
  }

  // Múltiplos candidatos sem unidade pra desempatar
  return { equipamentoId: null, candidatos };
}

// ─── Orquestrador ───────────────────────────────────────────────────────────
export async function casarTudo(tenantId, extracao) {
  const { localRisco, bens, tipoSeguro } = extracao;

  const matchUnidade = await casarUnidade(tenantId, localRisco);

  let matchEquipamento = { equipamentoId: null, candidatos: [] };
  if (tipoSeguro === 'EQUIPAMENTO') {
    matchEquipamento = await casarEquipamento(tenantId, bens, matchUnidade.unidadeId);

    // Se equipamento foi encontrado e tem unidade, usa a unidade do equipamento
    if (matchEquipamento.equipamentoId && !matchUnidade.unidadeId) {
      const equip = matchEquipamento.candidatos.find((c) => c.id === matchEquipamento.equipamentoId);
      if (equip?.unidade) {
        matchUnidade.unidadeId = equip.unidade.id;
        matchUnidade.candidatos = [equip.unidade];
        matchUnidade.confianca = 'derivada-do-equipamento';
      }
    }
  }

  return {
    unidade: matchUnidade,
    equipamento: matchEquipamento,
  };
}
