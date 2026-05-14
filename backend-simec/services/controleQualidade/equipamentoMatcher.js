// Matching de equipamento para fluxos de extracao LLM (single + lote).
//
// Estrategia de scoring composto:
//   1. Resolve a UNIDADE (CNPJ -> endereco -> cidade) do laudo. Filtra
//      candidatos para essa unidade (ou tenant inteiro se nao resolveu).
//   2. Pontua cada candidato em 5 sinais independentes:
//        serial (0.50)  — exato; parcial (substring) vale 0.30
//        modelo (0.40)  — exato; substring qualquer direcao vale 0.25
//        fabricante (0.10) — exato OU substring qualquer direcao
//        modalidade (0.10) — exato (eq.tipo === modalidade)
//        sala (0.15)    — setor casa (contains qualquer direcao)
//   3. Retorna o candidato com maior score se >= 0.30 E margem >= 0.10
//      sobre o segundo (evita ambiguidade).
//
// Vantagens sobre o cascade anterior:
//   - "Discovery 710" especifico vence "TC generico" mesmo se o TC generico
//     bater em sala/modalidade.
//   - Tolera divergencias de cadastro: tipo "Tomografia" vs "Tomografia
//     Computadorizada", ou setor faltando, sem invalidar todo o match.
//   - Margem de 0.10 evita escolher entre 2 candidatos quase-empate.

import prisma from '../prismaService.js';

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
}

function normalizarSala(s) {
  return normalizar(s).replace(/^sala\s+/i, '').replace(/\s+/g, ' ');
}

function normalizarCnpj(s) {
  return String(s || '').replace(/\D/g, '');
}

function extrairCidade(s) {
  if (!s) return null;
  const m = String(s).match(/^([^/,-]+)\s*[/,-]/);
  return m ? m[1].trim() : String(s).trim();
}

function casaContainsBidi(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function acharUnidade({ tenantId, unidadeIdentificada }) {
  if (!unidadeIdentificada) return null;
  const cnpjLimpo = normalizarCnpj(unidadeIdentificada.cnpj);

  // CNPJ exato (digitos)
  if (cnpjLimpo && cnpjLimpo.length >= 11) {
    const us = await prisma.unidade.findMany({
      where: { tenantId, cnpj: { not: null } },
      select: { id: true, nomeSistema: true, cnpj: true, cidade: true, logradouro: true },
    });
    const exato = us.find((u) => normalizarCnpj(u.cnpj) === cnpjLimpo);
    if (exato) return exato;
  }

  // Logradouro contains
  if (unidadeIdentificada.endereco) {
    const ruaMatch = String(unidadeIdentificada.endereco).match(/^([^,\d]+?)(?:\s*,|\s+\d)/);
    const rua = (ruaMatch?.[1] || unidadeIdentificada.endereco).trim();
    if (rua.length > 5) {
      const u = await prisma.unidade.findFirst({
        where: { tenantId, logradouro: { contains: rua, mode: 'insensitive' } },
      });
      if (u) return u;
    }
  }

  // Cidade unica
  const cidade = extrairCidade(unidadeIdentificada.cidade || unidadeIdentificada.endereco);
  if (cidade && cidade.length > 2) {
    const us = await prisma.unidade.findMany({
      where: { tenantId, cidade: { contains: cidade, mode: 'insensitive' } },
    });
    if (us.length === 1) return us[0];
  }

  return null;
}

// Pontua um candidato. Retorna { score, sinais: [...] } com lista textual
// dos sinais que bateram (vai pro criterio).
function scorePeloLaudo(eq, { serial, modelo, fabricante, modalidade, sala }) {
  let score = 0;
  const sinais = [];

  if (serial) {
    const serialNorm = normalizar(serial);
    const campos = [eq.tag, eq.numeroPatrimonio, eq.apelido]
      .filter(Boolean)
      .map(normalizar);
    if (campos.some((c) => c === serialNorm)) {
      score += 0.50;
      sinais.push('serial_exato');
    } else if (
      serialNorm.length >= 4 &&
      campos.some((c) => c.includes(serialNorm) || serialNorm.includes(c))
    ) {
      score += 0.30;
      sinais.push('serial_parcial');
    }
  }

  if (modelo && eq.modelo) {
    const m = normalizar(modelo);
    const em = normalizar(eq.modelo);
    if (em === m) {
      score += 0.40;
      sinais.push('modelo_exato');
    } else if (m.length >= 3 && (em.includes(m) || m.includes(em))) {
      score += 0.25;
      sinais.push('modelo_parcial');
    }
  }

  if (fabricante && eq.fabricante && casaContainsBidi(fabricante, eq.fabricante)) {
    score += 0.10;
    sinais.push('fabricante');
  }

  if (modalidade && eq.tipo) {
    if (normalizar(modalidade) === normalizar(eq.tipo)) {
      score += 0.10;
      sinais.push('modalidade_exata');
    } else if (casaContainsBidi(modalidade, eq.tipo)) {
      score += 0.05;
      sinais.push('modalidade_parcial');
    }
  }

  if (sala && eq.setor) {
    const ns = normalizarSala(sala);
    const nset = normalizarSala(eq.setor);
    if (ns === nset || ns.includes(nset) || nset.includes(ns)) {
      score += 0.15;
      sinais.push('sala');
    }
  }

  return { score, sinais };
}

export async function matchEquipamento({
  tenantId,
  modelo,
  serial,
  fabricante,
  modalidade,
  sala = null,
  unidadeIdentificada = null,
}) {
  // Resolve unidade — filtro forte
  const unidade = await acharUnidade({ tenantId, unidadeIdentificada });

  // Universo de candidatos: prefere unidade resolvida; sem ela, considera
  // tenant inteiro (fallback para laudos sem identificacao de cliente clara).
  const candidatos = await prisma.equipamento.findMany({
    where: {
      tenantId,
      ...(unidade ? { unidadeId: unidade.id } : {}),
    },
    select: {
      id: true, modelo: true, tag: true, apelido: true, tipo: true,
      fabricante: true, setor: true, numeroPatrimonio: true, unidadeId: true,
    },
  });

  if (candidatos.length === 0) return null;

  const sinais = { serial, modelo, fabricante, modalidade, sala };
  const scored = candidatos
    .map((eq) => ({ eq, ...scorePeloLaudo(eq, sinais) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const top = scored[0];
  const segundo = scored[1];

  // Threshold + margem para evitar match ambiguo entre quase-empates.
  // 0.30 = pelo menos 1 sinal forte (modelo_parcial) ou 2 fracos.
  // 0.10 = top precisa estar claramente acima do segundo.
  if (top.score < 0.30) return null;
  if (segundo && top.score - segundo.score < 0.10) {
    return {
      equipamento: null,
      score: top.score,
      criterio: 'multiplos_candidatos_proximos',
      candidatos: scored.slice(0, 3).map((c) => ({
        modelo: c.eq.modelo, tag: c.eq.tag, score: c.score,
      })),
    };
  }

  return {
    equipamento: top.eq,
    score: Math.min(0.95, top.score),
    criterio: top.sinais.join('+') || 'score',
  };
}
