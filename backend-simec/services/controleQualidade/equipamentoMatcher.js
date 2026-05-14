// Heuristica de matching de equipamento para fluxos de extracao LLM (single
// PDF + lote). Compartilhada entre /extrair-laudo e /importacao/extrair-lote
// para que o usuario tenha o equipamento pre-selecionado em ambos os casos.
//
// Estrategia em 3 niveis de confianca decrescente:
//   1. Serial exato em tag/patrimonio  -> score 0.95
//   2. Modelo + fabricante (1 unico)   -> score 0.70
//   3. Modelo + modalidade (1 unico)   -> score 0.55
//
// Retorna { equipamento, score, criterio } ou null.

import prisma from '../prismaService.js';

export async function matchEquipamento({
  tenantId,
  modelo,
  serial,
  fabricante,
  modalidade,
}) {
  if (!serial && !modelo) return null;

  // 1. Match por serial/tag/patrimonio exato
  if (serial) {
    const eq = await prisma.equipamento.findFirst({
      where: {
        tenantId,
        OR: [
          { tag: { equals: serial, mode: 'insensitive' } },
          { numeroPatrimonio: { equals: serial, mode: 'insensitive' } },
        ],
        ...(modalidade ? { tipo: modalidade } : {}),
      },
    });
    if (eq) return { equipamento: eq, score: 0.95, criterio: 'serial_exato' };
  }

  // 2. Match por modelo + fabricante (modalidade obrigatoria — evita falso
  //    positivo entre equipamentos de modalidades diferentes que casam por
  //    modelo/fabricante).
  if (modelo && fabricante && modalidade) {
    const eqs = await prisma.equipamento.findMany({
      where: {
        tenantId,
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

  // 3. Match por modelo + modalidade
  if (modelo && modalidade) {
    const eqs = await prisma.equipamento.findMany({
      where: {
        tenantId,
        tipo: modalidade,
        modelo: { contains: modelo, mode: 'insensitive' },
      },
    });
    if (eqs.length === 1) return { equipamento: eqs[0], score: 0.55, criterio: 'modelo_modalidade' };
  }

  return null;
}
