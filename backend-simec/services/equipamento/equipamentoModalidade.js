// Helpers de modalidade do equipamento (RM, TC, RX, MN, etc).
//
// Por que centralizar: a regra "este equipamento e de Ressonancia Magnetica?"
// estava replicada em 3 lugares (RM_FILTER no knowledgeLayerSync, regex no
// gehcMonitor, helper no insightsGenerator). Cada copia tinha sintaxe e
// criterio levemente diferentes — risco de drift quando uma e atualizada
// e as outras nao. Aqui ficam:
//
//   - ehEquipamentoRM(tipo)  — predicado JS (string -> boolean)
//   - RM_FILTER              — clausula Prisma WHERE para queries
//
// Mude apenas aqui se a regra precisar evoluir.

// "RM" como token isolado (entre limites de palavra) ou substring "ressonan"
// (cobre Ressonancia/Ressonância com ou sem acento).
const RM_TOKEN_REGEX = /(^|[^a-z0-9])rm($|[^a-z0-9])/i;

export function ehEquipamentoRM(tipo) {
  if (!tipo) return false;
  const t = String(tipo).trim();
  if (!t) return false;
  if (/resson[aâ]ncia/i.test(t)) return true;
  return RM_TOKEN_REGEX.test(t);
}

// Clausula Prisma WHERE equivalente. Usada em findMany/count/deleteMany para
// restringir queries ao subconjunto RM. Mantida pareada com ehEquipamentoRM.
export const RM_FILTER = Object.freeze({
  OR: [
    { tipo: { contains: 'Ressonância', mode: 'insensitive' } },
    { tipo: { contains: 'Ressonancia', mode: 'insensitive' } },
    { tipo: { contains: 'RM',          mode: 'insensitive' } },
  ],
});
