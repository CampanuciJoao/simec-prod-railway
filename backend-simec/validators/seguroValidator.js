// Ficheiro: backend-simec/validators/seguroValidator.js
import { z } from 'zod';

/**
 * Regras de validação para Seguros e Apólices.
 * Garante que os valores financeiros sejam números positivos
 * e que a vigência seja válida.
 */
export const seguroSchema = z.object({
  apoliceNumero: z.string().min(1, "O número da apólice é obrigatório."),
  seguradora: z.string().min(1, "A seguradora é obrigatória."),

  // Datas
  dataInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de início inválida."
  }),
  dataFim: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de término inválida."
  }),

  // Campos Financeiros
  premioTotal: z.coerce.number().nonnegative().optional().default(0),
  lmiIncendio: z.coerce.number().nonnegative().optional().default(0),
  lmiDanosEletricos: z.coerce.number().nonnegative().optional().default(0),
  lmiRoubo: z.coerce.number().nonnegative().optional().default(0),
  lmiVidros: z.coerce.number().nonnegative().optional().default(0),

  // 🔥 NOVO
  lmiVendaval: z.coerce.number().nonnegative().optional().default(0),

  lmiResponsabilidadeCivil: z.coerce.number().nonnegative().optional().default(0),
  lmiDanosMateriais: z.coerce.number().nonnegative().optional().default(0),
  lmiDanosCorporais: z.coerce.number().nonnegative().optional().default(0),
  lmiDanosMorais: z.coerce.number().nonnegative().optional().default(0),
  lmiAPP: z.coerce.number().nonnegative().optional().default(0),

  // Vínculos
  equipamentoId: z.string().nullable().optional(),
  unidadeId: z.string().nullable().optional(),

  cobertura: z.string().nullable().optional(),

  status: z
    .enum(['Ativo', 'Expirado', 'Cancelado', 'Vigente'])
    .optional()
    .default('Ativo'),
})
.superRefine((data, ctx) => {
  // 🔥 Validação de regra de negócio
  if (new Date(data.dataFim) < new Date(data.dataInicio)) {
    ctx.addIssue({
      path: ['dataFim'],
      code: z.ZodIssueCode.custom,
      message: 'A data de término não pode ser anterior à data de início.'
    });
  }

  // 🔥 Regra de vínculo (evita dados inconsistentes)
  if (data.equipamentoId && data.unidadeId === null) {
    ctx.addIssue({
      path: ['unidadeId'],
      code: z.ZodIssueCode.custom,
      message: 'Equipamento deve estar vinculado a uma unidade.'
    });
  }
});