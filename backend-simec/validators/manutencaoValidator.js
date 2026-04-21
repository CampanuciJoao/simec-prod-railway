import { z } from 'zod';

const localDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const localTimeRegex = /^\d{2}:\d{2}$/;
const CAMPOS_BASE = [
  'equipamentoId',
  'tipo',
  'agendamentoDataInicioLocal',
  'agendamentoHoraInicioLocal',
  'agendamentoDataFimLocal',
  'agendamentoHoraFimLocal',
];

export const MANUTENCAO_FIELD_LABELS = {
  equipamentoId: 'equipamento',
  tipo: 'tipo da manutencao',
  agendamentoDataInicioLocal: 'data inicial',
  agendamentoHoraInicioLocal: 'hora inicial',
  agendamentoDataFimLocal: 'data final',
  agendamentoHoraFimLocal: 'hora final',
  numeroChamado: 'numero do chamado',
  descricaoProblemaServico: 'descricao do servico',
};

export function obterCamposObrigatoriosManutencao(tipo) {
  return tipo === 'Corretiva'
    ? [...CAMPOS_BASE, 'numeroChamado', 'descricaoProblemaServico']
    : CAMPOS_BASE;
}

export const manutencaoSchema = z
  .object({
    equipamentoId: z
      .string({
        required_error: 'O equipamento e obrigatorio.',
      })
      .min(1, 'O equipamento e obrigatorio.'),

    tipo: z.enum(['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'], {
      errorMap: () => ({ message: 'Tipo de manutencao invalido.' }),
    }),

    descricaoProblemaServico: z.string().trim().nullable().optional(),

    agendamentoDataInicioLocal: z
      .string({
        required_error: 'A data inicial e obrigatoria.',
      })
      .regex(localDateRegex, 'A data inicial deve estar no formato YYYY-MM-DD.'),

    agendamentoHoraInicioLocal: z
      .string({
        required_error: 'A hora inicial e obrigatoria.',
      })
      .regex(localTimeRegex, 'A hora inicial deve estar no formato HH:mm.'),

    agendamentoDataFimLocal: z
      .string({
        required_error: 'A data final e obrigatoria.',
      })
      .regex(localDateRegex, 'A data final deve estar no formato YYYY-MM-DD.'),

    agendamentoHoraFimLocal: z
      .string({
        required_error: 'A hora final e obrigatoria.',
      })
      .regex(localTimeRegex, 'A hora final deve estar no formato HH:mm.'),

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
    const possuiInicioCompleto =
      !!data.agendamentoDataInicioLocal && !!data.agendamentoHoraInicioLocal;
    const possuiFimCompleto =
      !!data.agendamentoDataFimLocal && !!data.agendamentoHoraFimLocal;

    const inicio = possuiInicioCompleto
      ? new Date(
          `${data.agendamentoDataInicioLocal}T${data.agendamentoHoraInicioLocal}:00`
        )
      : null;

    const fim = possuiFimCompleto
      ? new Date(
          `${data.agendamentoDataFimLocal}T${data.agendamentoHoraFimLocal}:00`
        )
      : null;

    if (inicio && Number.isNaN(inicio.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agendamentoDataInicioLocal'],
        message: 'Data/hora inicial invalida.',
      });
    }

    if (fim && Number.isNaN(fim.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agendamentoDataFimLocal'],
        message: 'Data/hora final invalida.',
      });
    }

    if (
      inicio &&
      fim &&
      !Number.isNaN(inicio.getTime()) &&
      !Number.isNaN(fim.getTime()) &&
      fim.getTime() <= inicio.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agendamentoHoraFimLocal'],
        message: 'O termino deve ser posterior ao inicio.',
      });
    }

    if (data.tipo === 'Corretiva') {
      if (!data.numeroChamado?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['numeroChamado'],
          message: 'O numero do chamado e obrigatorio para manutencao corretiva.',
        });
      }

      if (!data.descricaoProblemaServico?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['descricaoProblemaServico'],
          message: 'A descricao do servico e obrigatoria para manutencao corretiva.',
        });
      }
    }
  });

export function validarManutencaoPayload(payload) {
  const result = manutencaoSchema.safeParse(payload);

  if (result.success) {
    return {
      ok: true,
      data: result.data,
      fieldErrors: {},
      missingFields: [],
    };
  }

  const fieldErrors = {};
  const missingFields = [];

  for (const issue of result.error.issues) {
    const path = issue.path?.[0];
    if (!path || fieldErrors[path]) continue;

    fieldErrors[path] = issue.message;

    if (obterCamposObrigatoriosManutencao(payload?.tipo).includes(path)) {
      missingFields.push(path);
    }
  }

  return {
    ok: false,
    data: null,
    fieldErrors,
    missingFields,
    message:
      result.error.issues?.[0]?.message || 'Dados de manutencao invalidos.',
  };
}
