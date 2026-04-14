// Ficheiro: backend-simec/validators/manutencaoValidator.js

import { z } from 'zod';

const localDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const localTimeRegex = /^\d{2}:\d{2}$/;

export const manutencaoSchema = z
  .object({
    equipamentoId: z
      .string({
        required_error: 'O equipamento é obrigatório.',
      })
      .min(1, 'O equipamento é obrigatório.'),

    tipo: z.enum(['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'], {
      errorMap: () => ({ message: 'Tipo de manutenção inválido.' }),
    }),

    descricaoProblemaServico: z
      .string({
        required_error: 'A descrição do serviço é obrigatória.',
      })
      .min(3, 'A descrição deve ter pelo menos 3 caracteres.'),

    agendamentoDataLocal: z
      .string({
        required_error: 'A data do agendamento é obrigatória.',
      })
      .regex(localDateRegex, 'A data deve estar no formato YYYY-MM-DD.'),

    agendamentoHoraInicioLocal: z
      .string({
        required_error: 'A hora inicial é obrigatória.',
      })
      .regex(localTimeRegex, 'A hora inicial deve estar no formato HH:mm.'),

    agendamentoHoraFimLocal: z
      .string()
      .regex(localTimeRegex, 'A hora final deve estar no formato HH:mm.')
      .nullable()
      .optional(),

    tecnicoResponsavel: z.string().trim().nullable().optional(),
    numeroChamado: z.string().trim().nullable().optional(),
    custoTotal: z.number().nonnegative().nullable().optional(),
    status: z
      .enum([
        'Agendada',
        'EmAndamento',
        'Concluida',
        'Cancelada',
        'Pendente',
        'AguardandoConfirmacao',
      ])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.agendamentoHoraFimLocal &&
      data.agendamentoHoraFimLocal <= data.agendamentoHoraInicioLocal
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agendamentoHoraFimLocal'],
        message: 'A hora final deve ser maior que a hora inicial.',
      });
    }

    if (data.tipo === 'Corretiva' && !data.numeroChamado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numeroChamado'],
        message: 'O número do chamado é obrigatório para manutenção corretiva.',
      });
    }
  });