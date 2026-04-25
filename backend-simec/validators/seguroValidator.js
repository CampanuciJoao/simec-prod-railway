import { z } from 'zod';

export const seguroSchema = z
  .object({
    apoliceNumero: z.string().min(1, 'O numero da apolice e obrigatorio.'),
    seguradora: z.string().min(1, 'A seguradora e obrigatoria.'),

    dataInicio: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Data de inicio invalida.',
    }),
    dataFim: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Data de termino invalida.',
    }),

    premioTotal: z.coerce.number().nonnegative().optional().default(0),
    lmiIncendio: z.coerce.number().nonnegative().optional().default(0),
    lmiDanosEletricos: z.coerce.number().nonnegative().optional().default(0),
    lmiRoubo: z.coerce.number().nonnegative().optional().default(0),
    lmiVidros: z.coerce.number().nonnegative().optional().default(0),
    lmiColisao: z.coerce.number().nonnegative().optional().default(0),
    lmiVendaval: z.coerce.number().nonnegative().optional().default(0),
    lmiDanosCausaExterna: z.coerce.number().nonnegative().optional().default(0),
    lmiPerdaLucroBruto: z.coerce.number().nonnegative().optional().default(0),
    lmiVazamentoTanques: z.coerce.number().nonnegative().optional().default(0),
    lmiResponsabilidadeCivil: z.coerce.number().nonnegative().optional().default(0),
    lmiDanosMateriais: z.coerce.number().nonnegative().optional().default(0),
    lmiDanosCorporais: z.coerce.number().nonnegative().optional().default(0),
    lmiDanosMorais: z.coerce.number().nonnegative().optional().default(0),
    lmiAPP: z.coerce.number().nonnegative().optional().default(0),

    equipamentoId: z.string().nullable().optional(),
    unidadeId: z.string().nullable().optional(),
    cobertura: z.string().nullable().optional(),

    status: z
      .enum(['Ativo', 'Expirado', 'Cancelado', 'Vigente'])
      .optional()
      .default('Ativo'),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.dataFim) < new Date(data.dataInicio)) {
      ctx.addIssue({
        path: ['dataFim'],
        code: z.ZodIssueCode.custom,
        message: 'A data de termino nao pode ser anterior a data de inicio.',
      });
    }

    if (data.equipamentoId && data.unidadeId === null) {
      ctx.addIssue({
        path: ['unidadeId'],
        code: z.ZodIssueCode.custom,
        message: 'Equipamento deve estar vinculado a uma unidade.',
      });
    }
  });
