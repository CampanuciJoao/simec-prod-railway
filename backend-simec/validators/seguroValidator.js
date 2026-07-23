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

    tipoSeguro: z
      .enum(['EQUIPAMENTO', 'PREDIAL', 'AUTO', 'RESPONSABILIDADE_CIVIL', 'OUTRO'])
      .optional()
      .default('EQUIPAMENTO'),

    tipoAlvo: z
      .enum(['EQUIPAMENTO', 'UNIDADE', 'VEICULO', 'EMPRESARIAL_GERAL'])
      .optional()
      .default('EQUIPAMENTO'),

    equipamentoId: z.string().nullable().optional(),
    unidadeId: z.string().nullable().optional(),
    veiculoId: z.string().nullable().optional(),
    // Quando o seguro e' AUTO e o veiculo ainda nao foi cadastrado, o
    // usuario informa placa + modelo direto no form. Backend faz upsert
    // por (tenantId, placa) e vincula veiculoId no seguro criado.
    veiculoPlaca: z.string().max(10).nullable().optional(),
    veiculoModelo: z.string().max(120).nullable().optional(),
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

    // AUTO exige que o veiculo seja identificado: seja pelo veiculoId
    // (veiculo ja cadastrado) OU por placa + modelo (novo veiculo).
    if (data.tipoSeguro === 'AUTO' && !data.veiculoId) {
      const semPlaca  = !data.veiculoPlaca  || !data.veiculoPlaca.trim();
      const semModelo = !data.veiculoModelo || !data.veiculoModelo.trim();
      if (semPlaca) {
        ctx.addIssue({
          path: ['veiculoPlaca'],
          code: z.ZodIssueCode.custom,
          message: 'A placa do veiculo e obrigatoria para seguro Auto.',
        });
      }
      if (semModelo) {
        ctx.addIssue({
          path: ['veiculoModelo'],
          code: z.ZodIssueCode.custom,
          message: 'O modelo do veiculo e obrigatorio para seguro Auto.',
        });
      }
    }
  });
