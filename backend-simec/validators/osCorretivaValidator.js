import { z } from 'zod';

const STATUS_EQUIPAMENTO_ABERTURA = ['Inoperante', 'UsoLimitado', 'EmManutencao'];

export const abrirOsSchema = z.object({
  equipamentoId: z.string().min(1, 'Equipamento é obrigatório.'),
  solicitante: z.string().min(1, 'Solicitante é obrigatório.').max(120),
  descricaoProblema: z.string().min(1, 'Descrição do problema é obrigatória.').max(2000),
  statusEquipamentoAbertura: z.enum(STATUS_EQUIPAMENTO_ABERTURA, {
    errorMap: () => ({
      message: `Status do equipamento deve ser: ${STATUS_EQUIPAMENTO_ABERTURA.join(', ')}.`,
    }),
  }),
});

export function validarAbrirOs(payload) {
  const result = abrirOsSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return {
    ok: false,
    message: 'Dados inválidos para abertura da OS.',
    fieldErrors,
  };
}

export const notaAndamentoSchema = z.object({
  nota: z.string().min(1, 'O texto da nota é obrigatório.').max(2000),
  tecnicoNome: z.string().min(1, 'Nome do técnico é obrigatório.').max(120).optional(),
});

export function validarNota(payload) {
  const result = notaAndamentoSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: 'Dados inválidos para nota de andamento.', fieldErrors };
}

export const agendarVisitaSchema = z.object({
  prestadorNome: z.string().min(1, 'Nome do prestador é obrigatório.').max(200),
  dataHoraInicioPrevista: z.string().datetime({ message: 'Data/hora de início inválida.' }),
  dataHoraFimPrevista: z.string().datetime({ message: 'Data/hora de fim inválida.' }),
}).superRefine((data, ctx) => {
  const inicio = new Date(data.dataHoraInicioPrevista);
  const fim = new Date(data.dataHoraFimPrevista);
  if (fim <= inicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataHoraFimPrevista'],
      message: 'A data/hora de fim deve ser posterior ao início.',
    });
  }
});

export function validarAgendarVisita(payload) {
  const result = agendarVisitaSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: 'Dados inválidos para agendamento de visita.', fieldErrors };
}

export const registrarResultadoSchema = z.object({
  resultado: z.enum(['Operante', 'PrazoEstendido'], {
    errorMap: () => ({ message: 'Resultado inválido.' }),
  }),
  observacoes: z.string().max(2000).optional(),
  novaDataHoraInicioPrevista: z.string().datetime().optional(),
  novaDataHoraFimPrevista: z.string().datetime().optional(),
}).superRefine((data, ctx) => {
  if (data.resultado === 'PrazoEstendido') {
    if (!data.novaDataHoraInicioPrevista) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['novaDataHoraInicioPrevista'],
        message: 'Nova data de início é obrigatória ao estender prazo.',
      });
    }
    if (!data.novaDataHoraFimPrevista) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['novaDataHoraFimPrevista'],
        message: 'Nova data de fim é obrigatória ao estender prazo.',
      });
    }
    if (
      data.novaDataHoraInicioPrevista &&
      data.novaDataHoraFimPrevista &&
      new Date(data.novaDataHoraFimPrevista) <= new Date(data.novaDataHoraInicioPrevista)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['novaDataHoraFimPrevista'],
        message: 'A data/hora de fim deve ser posterior ao início.',
      });
    }
  }
});

export function validarRegistrarResultado(payload) {
  const result = registrarResultadoSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: 'Dados inválidos para registro de resultado.', fieldErrors };
}

export const concluirOsSchema = z.object({
  observacoesFinais: z.string().max(2000).optional(),
});

export function validarConcluirOs(payload) {
  const result = concluirOsSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: 'Dados inválidos para conclusão da OS.', fieldErrors: {} };
}
