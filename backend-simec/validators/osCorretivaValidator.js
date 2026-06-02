import { z } from 'zod';

// Operante e aceito para casos de "incidente registrado sem impacto
// operacional" (ex: firmware reset que nao parou o exame mas precisa
// constar no historico). Para Operante, o status do equipamento nao
// muda no sistema.
const STATUS_EQUIPAMENTO_ABERTURA = ['Operante', 'Inoperante', 'UsoLimitado', 'EmManutencao'];

export const abrirOsSchema = z.object({
  equipamentoId: z.string().min(1, 'Equipamento é obrigatório.'),
  solicitante: z.string().min(1, 'Solicitante é obrigatório.').max(120),
  descricaoProblema: z.string().min(1, 'Descrição do problema é obrigatória.').max(2000),
  statusEquipamentoAbertura: z.enum(STATUS_EQUIPAMENTO_ABERTURA, {
    errorMap: () => ({
      message: `Status do equipamento deve ser: ${STATUS_EQUIPAMENTO_ABERTURA.join(', ')}.`,
    }),
  }),
  // Hora real do evento (quando o problema aconteceu). Pode ser anterior a
  // "agora" (registro retroativo); nao pode ser futuro.
  dataHoraInicioEvento: z.string().datetime({ message: 'Data/hora do evento inválida.' }).optional(),
}).superRefine((data, ctx) => {
  if (data.dataHoraInicioEvento && new Date(data.dataHoraInicioEvento) > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataHoraInicioEvento'],
      message: 'A hora do evento não pode ser futura.',
    });
  }
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

// Edição admin de nota: campos opcionais — pode alterar só o texto, só
// a data, ou ambos. Ao menos um deve vir. data deve ser ISO válida.
export const editarNotaAndamentoSchema = z
  .object({
    nota: z.string().min(1).max(2000).optional(),
    data: z
      .string()
      .datetime({ offset: true, message: 'Data inválida (formato ISO esperado).' })
      .optional(),
  })
  .refine((d) => d.nota !== undefined || d.data !== undefined, {
    message: 'Informe ao menos um campo para editar (nota ou data).',
  });

export function validarEdicaoNota(payload) {
  const result = editarNotaAndamentoSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return {
    ok: false,
    message: 'Dados inválidos para edição da nota.',
    fieldErrors,
  };
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

// Reagendar visita Agendada (sem cancelar a OS). Difere do agendar:
// - prestadorNome eh opcional (null/undefined = mantem o atual)
// - motivo eh obrigatorio (justificativa do reagendamento — auditoria)
export const reagendarVisitaSchema = z.object({
  prestadorNome: z.string().min(1).max(200).optional().nullable(),
  dataHoraInicioPrevista: z.string().datetime({ message: 'Data/hora de início inválida.' }),
  dataHoraFimPrevista: z.string().datetime({ message: 'Data/hora de fim inválida.' }),
  motivo: z.string()
    .min(3, 'Motivo do reagendamento é obrigatório (mínimo 3 caracteres).')
    .max(500, 'Motivo muito longo (máximo 500 caracteres).'),
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

export function validarReagendarVisita(payload) {
  const result = reagendarVisitaSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: 'Dados inválidos para reagendamento de visita.', fieldErrors };
}

export const registrarResultadoSchema = z.object({
  // Resultado da visita:
  //   Operante       — manutencao OK, equipamento liberado, OS encerra
  //   PrazoEstendido — manutencao em andamento, equipamento ainda inoperante,
  //                    precisa de mais tempo (nova visita do MESMO prestador)
  //   NaoRealizada   — visita NAO aconteceu (no-show do tecnico, peca atrasou,
  //                    etc). Reagenda sem trocar status do equipamento.
  //                    Motivo eh OBRIGATORIO pra auditoria.
  resultado: z.enum(['Operante', 'PrazoEstendido', 'NaoRealizada'], {
    errorMap: () => ({ message: 'Resultado inválido.' }),
  }),
  observacoes: z.string().max(2000).optional(),
  motivoNaoRealizacao: z.string().min(3).max(500).optional(),
  dataHoraFimReal: z.string().datetime({ message: 'Data/hora de conclusão inválida.' }).optional(),
  novaDataHoraInicioPrevista: z.string().datetime().optional(),
  novaDataHoraFimPrevista: z.string().datetime().optional(),
}).superRefine((data, ctx) => {
  const precisaNovaData = data.resultado === 'PrazoEstendido' || data.resultado === 'NaoRealizada';

  if (precisaNovaData) {
    if (!data.novaDataHoraInicioPrevista) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['novaDataHoraInicioPrevista'],
        message: 'Nova data de início é obrigatória.',
      });
    }
    if (!data.novaDataHoraFimPrevista) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['novaDataHoraFimPrevista'],
        message: 'Nova data de fim é obrigatória.',
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

  if (data.resultado === 'NaoRealizada' && !data.motivoNaoRealizacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['motivoNaoRealizacao'],
      message: 'Informe o motivo pelo qual a manutenção não foi realizada.',
    });
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
  // Hora real em que o problema foi efetivamente resolvido. Pode ser
  // anterior a "agora" (registro retroativo); nao pode ser futura. O
  // momento em que o admin marcou a conclusao no sistema fica em
  // dataHoraConclusao (sempre = new Date() no service).
  dataHoraFimEvento: z
    .string()
    .datetime({ offset: true, message: 'Data/hora do evento inválida.' })
    .optional(),
}).superRefine((data, ctx) => {
  if (data.dataHoraFimEvento && new Date(data.dataHoraFimEvento) > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataHoraFimEvento'],
      message: 'A hora do evento não pode ser futura.',
    });
  }
});

// Validator para mover OS para outro equipamento.
export const moverOsEquipamentoSchema = z.object({
  novoEquipamentoId: z.string().min(1, 'Novo equipamento é obrigatório.'),
  motivo: z.string().min(3, 'Motivo é obrigatório (mínimo 3 caracteres).').max(500),
});

export function validarMoverOsEquipamento(payload) {
  const result = moverOsEquipamentoSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: 'Dados inválidos para mover OS.', fieldErrors };
}

export function validarConcluirOs(payload) {
  const result = concluirOsSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: 'Dados inválidos para conclusão da OS.', fieldErrors };
}
