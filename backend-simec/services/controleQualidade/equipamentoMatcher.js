// Heuristica de matching de equipamento para fluxos de extracao LLM (single
// PDF + lote). Compartilhada entre /extrair-laudo e /importacao/extrair-lote
// para que o usuario tenha o equipamento pre-selecionado em ambos os casos.
//
// Estrategia:
//   1. Tenta achar a UNIDADE pelo CNPJ -> endereco -> cidade do laudo. Se
//      encontrar, usa como filtro adicional (drasticamente reduz falsos
//      positivos em tenants com varios sites).
//   2. Match de equipamento dentro do escopo (unidade + tenant) na ordem:
//      a. Serial exato em tag/numeroPatrimonio/apelido      -> 0.95
//      b. (unidade + modalidade) com 1 unico equipamento    -> 0.90
//         (ex: tem 1 so TC nesta unidade -> bingo)
//      c. Modelo + fabricante (1 unico)                     -> 0.70
//      d. Modelo (1 unico)                                  -> 0.55
//
// Retorna { equipamento, score, criterio } ou null.

import prisma from '../prismaService.js';

function normalizarCnpj(s) {
  return String(s || '').replace(/\D/g, '');
}

// Extrai cidade do "Cidade/UF" tipico do PDF (ex: "Dourados/MS" -> "Dourados").
function extrairCidade(s) {
  if (!s) return null;
  const m = String(s).match(/^([^/,-]+)\s*[/,-]/);
  return m ? m[1].trim() : String(s).trim();
}

async function acharUnidade({ tenantId, unidadeIdentificada }) {
  if (!unidadeIdentificada) return null;
  const cnpjLimpo = normalizarCnpj(unidadeIdentificada.cnpj);

  // 1. CNPJ exato (mais confiavel — comparacao por digitos para tolerar
  //    formatacoes diferentes "03.304.188/0001-50" vs "03304188000150")
  if (cnpjLimpo && cnpjLimpo.length >= 11) {
    const candidatos = await prisma.unidade.findMany({
      where: { tenantId, cnpj: { not: null } },
      select: { id: true, nomeSistema: true, cnpj: true, cidade: true, logradouro: true },
    });
    const exato = candidatos.find((u) => normalizarCnpj(u.cnpj) === cnpjLimpo);
    if (exato) return exato;
  }

  // 2. Endereco (logradouro contains) — case insensitive, comparado contra
  //    o "Rua X, 1234 - Cidade/UF" do laudo
  if (unidadeIdentificada.endereco) {
    // tenta extrair so o nome da rua (sem numero) para increase match rate
    const ruaMatch = String(unidadeIdentificada.endereco).match(/^([^,\d]+?)(?:\s*,|\s+\d)/);
    const rua = (ruaMatch?.[1] || unidadeIdentificada.endereco).trim();
    if (rua.length > 5) {
      const u = await prisma.unidade.findFirst({
        where: {
          tenantId,
          logradouro: { contains: rua, mode: 'insensitive' },
        },
      });
      if (u) return u;
    }
  }

  // 3. Cidade — fallback fraco, so funciona se houver 1 unica unidade na cidade
  const cidade = extrairCidade(unidadeIdentificada.cidade || unidadeIdentificada.endereco);
  if (cidade && cidade.length > 2) {
    const us = await prisma.unidade.findMany({
      where: {
        tenantId,
        cidade: { contains: cidade, mode: 'insensitive' },
      },
    });
    if (us.length === 1) return us[0];
  }

  return null;
}

export async function matchEquipamento({
  tenantId,
  modelo,
  serial,
  fabricante,
  modalidade,
  unidadeIdentificada = null,
}) {
  // Tenta resolver a unidade primeiro — drasticamente reduz falsos positivos
  // em tenants com varios sites (ex: Cerdil tem Sede + MTZ + Cassems Navirai).
  const unidade = await acharUnidade({ tenantId, unidadeIdentificada });
  const filtroUnidade = unidade ? { unidadeId: unidade.id } : {};

  // 1. Serial exato em tag/patrimonio/apelido (independe de unidade — serial
  //    eh global e nao se repete entre equipamentos)
  if (serial) {
    const eq = await prisma.equipamento.findFirst({
      where: {
        tenantId,
        OR: [
          { tag: { equals: serial, mode: 'insensitive' } },
          { numeroPatrimonio: { equals: serial, mode: 'insensitive' } },
          { apelido: { equals: serial, mode: 'insensitive' } },
        ],
        ...(modalidade ? { tipo: modalidade } : {}),
      },
    });
    if (eq) return { equipamento: eq, score: 0.95, criterio: 'serial_exato' };
  }

  // 2. Unidade + modalidade unica (caso muito comum — "tem 1 so TC na unidade X")
  if (unidade && modalidade) {
    const eqs = await prisma.equipamento.findMany({
      where: { tenantId, unidadeId: unidade.id, tipo: modalidade },
    });
    if (eqs.length === 1) {
      return { equipamento: eqs[0], score: 0.9, criterio: 'unidade_modalidade_unico' };
    }
  }

  // 3. Modelo + fabricante (modalidade obrigatoria — evita falso positivo)
  if (modelo && fabricante && modalidade) {
    const eqs = await prisma.equipamento.findMany({
      where: {
        tenantId,
        ...filtroUnidade,
        tipo: modalidade,
        modelo: { contains: modelo, mode: 'insensitive' },
        fabricante: { contains: fabricante, mode: 'insensitive' },
      },
    });
    if (eqs.length === 1) return { equipamento: eqs[0], score: 0.7, criterio: 'modelo_fabricante' };
    if (eqs.length > 1) {
      return {
        equipamento: null,
        score: 0.4,
        criterio: 'multiplos_candidatos',
        candidatos: eqs.length,
      };
    }
  }

  // 4. Modelo + modalidade
  if (modelo && modalidade) {
    const eqs = await prisma.equipamento.findMany({
      where: {
        tenantId,
        ...filtroUnidade,
        tipo: modalidade,
        modelo: { contains: modelo, mode: 'insensitive' },
      },
    });
    if (eqs.length === 1) return { equipamento: eqs[0], score: 0.55, criterio: 'modelo_modalidade' };
  }

  return null;
}
