import { z } from 'zod';

const localDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const localTimeRegex = /^\d{2}:\d{2}$/;

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

// Corretiva em triagem: sem agendamento, sem chamado obrigatorio
export const manutencaoSchemaTriagem = z.object({
  equipamentoId: z
    .string({ required_error: 'O equipamento e obrigatorio.' })
    .min(1, 'O equipamento e obrigatorio.'),
  tipo: z.enum(['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'], {
    errorMap: () => ({ message: 'Tipo de manutencao invalido.' }),
  }),
  descricaoProblemaServico: z.string().trim().nullable().optional(),
  numeroChamado: z.string().trim().nullable().optional(),
  tecnicoResponsavel: z.string().trim().nullable().optional(),
  solicitante: z.string().trim().nullable().optional(),
  origemAbertura: z.string().trim().nullable().optional(),
});

// Agendamento completo: preventiva/calibracao/inspecao + corretiva com visita agendada
const agendamentoCampos = z.object({
  agendamentoDataInicioLocal: z
    .string({ required_error: 'A data inicial e obrigatoria.' })
    .regex(localDateRegex, 'A data inicial deve estar no formato YYYY-MM-DD.'),
  agendamentoHoraInicioLocal: z
    .string({ required_error: 'A hora inicial e obrigatoria.' })
    .regex(localTimeRegex, 'A hora inicial deve estar no formato HH:mm.'),
  agendamentoDataFimLocal: z
    .string({ required_error: 'A data final e obrigatoria.' })
    .regex(localDateRegex, 'A data final deve estar no formato YYYY-MM-DD.'),
  agendamentoHoraFimLocal: z
    .string({ required_error: 'A hora final e obrigatoria.' })
    .regex(localTimeRegex, 'A hora final deve estar no formato HH:mm.'),
});

export const manutencaoSchema = z
  .object({
    equipamentoId: z
      .string({ required_error: 'O equipamento e obrigatorio.' })
      .min(1, 'O equipamento e obrigatorio.'),
    tipo: z.enum(['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'], {
      errorMap: () => ({ message: 'Tipo de manutencao invalido.' }),
    }),
    descricaoProblemaServico: z.string().trim().nullable().optional(),
    agendamentoDataInicioLocal: z
      .string()
      .regex(localDateRegex, 'A data inicial deve estar no formato YYYY-MM-DD.')
      .optional(),
    agendamentoHoraInicioLocal: z
      .string()
      .regex(localTimeRegex, 'A hora inicial deve estar no formato HH:mm.')
      .optional(),
    agendamentoDataFimLocal: z
      .string()
      .regex(localDateRegex, 'A data final deve estar no formato YYYY-MM-DD.')
      .optional(),
    agendamentoHoraFimLocal: z
      .string()
      .regex(localTimeRegex, 'A hora final deve estar no formato HH:mm.')
      .optional(),
    tecnicoResponsavel: z.string().trim().nullable().optional(),
    numeroChamado: z.string().trim().nullable().optional(),
    solicitante: z.string().trim().nullable().optional(),
    origemAbertura: z.string().trim().nullable().optional(),
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
    const temInicio = !!data.agendamentoDataInicioLocal && !!data.agendamentoHoraInicioLocal;
    const temFim = !!data.agendamentoDataFimLocal && !!data.agendamentoHoraFimLocal;
    const temAgendamento = temInicio || temFim;

    // Se informou alguma data, exige todas as partes
    if (temAgendamento) {
      if (!temInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agendamentoDataInicioLocal'],
          message: 'A data e hora inicial sao obrigatorias quando informado agendamento.',
        });
      }
      if (!temFim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agendamentoDataFimLocal'],
          message: 'A data e hora final sao obrigatorias quando informado agendamento.',
        });
      }
    }

    // Preventiva/Calibracao/Inspecao exigem agendamento
    if (['Preventiva', 'Calibracao', 'Inspecao'].includes(data.tipo) && !temAgendamento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agendamentoDataInicioLocal'],
        message: 'O agendamento e obrigatorio para este tipo de manutencao.',
      });
    }

    if (temInicio && temFim) {
      const inicio = new Date(
        `${data.agendamentoDataInicioLocal}T${data.agendamentoHoraInicioLocal}:00`
      );
      const fim = new Date(
        `${data.agendamentoDataFimLocal}T${data.agendamentoHoraFimLocal}:00`
      );

      if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim <= inicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['agendamentoHoraFimLocal'],
          message: 'O termino deve ser posterior ao inicio.',
        });
      }
    }
  });

// Validator para agendamento de visita (Pendente → Agendada)
export const agendarVisitaSchema = z
  .object({
    agendamentoDataInicioLocal: z
      .string({ required_error: 'A data inicial e obrigatoria.' })
      .regex(localDateRegex, 'A data inicial deve estar no formato YYYY-MM-DD.'),
    agendamentoHoraInicioLocal: z
      .string({ required_error: 'A hora inicial e obrigatoria.' })
      .regex(localTimeRegex, 'A hora inicial deve estar no formato HH:mm.'),
    agendamentoDataFimLocal: z
      .string({ required_error: 'A data final e obrigatoria.' })
      .regex(localDateRegex, 'A data final deve estar no formato YYYY-MM-DD.'),
    agendamentoHoraFimLocal: z
      .string({ required_error: 'A hora final e obrigatoria.' })
      .regex(localTimeRegex, 'A hora final deve estar no formato HH:mm.'),
    numeroChamado: z
      .string({ required_error: 'O numero do chamado e obrigatorio para agendar visita.' })
      .min(1, 'O numero do chamado e obrigatorio para agendar visita.'),
    tecnicoResponsavel: z.string().trim().nullable().optional(),
    observacao: z.string().trim().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const inicio = new Date(
      `${data.agendamentoDataInicioLocal}T${data.agendamentoHoraInicioLocal}:00`
    );
    const fim = new Date(
      `${data.agendamentoDataFimLocal}T${data.agendamentoHoraFimLocal}:00`
    );

    if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim <= inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agendamentoHoraFimLocal'],
        message: 'O termino deve ser posterior ao inicio.',
      });
    }
  });

export function obterCamposObrigatoriosManutencao(tipo) {
  const base = ['equipamentoId', 'tipo'];
  if (['Preventiva', 'Calibracao', 'Inspecao'].includes(tipo)) {
    return [
      ...base,
      'agendamentoDataInicioLocal',
      'agendamentoHoraInicioLocal',
      'agendamentoDataFimLocal',
      'agendamentoHoraFimLocal',
    ];
  }
  return base;
}

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
    message: result.error.issues?.[0]?.message || 'Dados de manutencao invalidos.',
  };
}

export function validarAgendarVisitaPayload(payload) {
  const result = agendarVisitaSchema.safeParse(payload);

  if (result.success) {
    return { ok: true, data: result.data, fieldErrors: {} };
  }

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path?.[0];
    if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
  }

  return {
    ok: false,
    data: null,
    fieldErrors,
    message: result.error.issues?.[0]?.message || 'Dados de agendamento invalidos.',
  };
}
