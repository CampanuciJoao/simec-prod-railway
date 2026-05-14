// Validators do modulo Controle de Qualidade.
// Schemas Zod consumidos pelo middleware validate.

import { z } from 'zod';

const RESULTADOS = ['Aprovado', 'AprovadoComRestricoes', 'Reprovado'];

// Item de pendencia do laudo (ex: "Afixar simbolo de radiacao na porta")
const pendenciaSchema = z.object({
  descricao:    z.string().min(1, 'Descricao da pendencia eh obrigatoria.').max(500),
  resolvido:    z.boolean().default(false),
  criadoEm:     z.string().datetime().optional(),
  dataResolucao: z.string().datetime().optional(),
  resolvidoPor: z.string().uuid().optional(),
  observacao:   z.string().max(500).optional(),
});

// ─── Catalogo de tipos ──────────────────────────────────────────────────────

export const tipoTesteCreateSchema = z.object({
  codigo:            z.string().min(2).max(60).regex(/^[A-Z0-9_]+$/, 'Codigo deve ser MAIUSCULO_COM_UNDERSCORE.'),
  nome:              z.string().min(2).max(200),
  modalidade:        z.string().min(2).max(100),
  frequenciaDias:    z.number().int().positive('Frequencia deve ser positiva (em dias).'),
  obrigatorio:       z.boolean().optional(),
  normaReferencia:   z.string().max(120).optional(),
  responsavelTipico: z.string().max(100).optional(),
  descricao:         z.string().max(2000).optional(),
  ativo:             z.boolean().optional(),
});

export const tipoTesteUpdateSchema = tipoTesteCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' }
);

// ─── Execucoes de teste ──────────────────────────────────────────────────────

export const testeCreateSchema = z.object({
  equipamentoId:       z.string().uuid('Equipamento invalido.'),
  tipoTesteId:         z.string().uuid('Tipo de teste invalido.'),
  dataExecucao:        z.string().datetime({ message: 'Data de execucao invalida.' })
                       .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD.')),
  resultado:           z.enum(RESULTADOS, { errorMap: () => ({ message: `Resultado invalido. Use: ${RESULTADOS.join(', ')}.` }) }),
  numeroLaudo:         z.string().max(120).optional(),
  empresaExecutora:    z.string().max(200).optional(),
  responsavelNome:     z.string().max(200).optional(),
  responsavelRegistro: z.string().max(120).optional(),
  validadeMeses:       z.number().int().positive().max(120).optional(),
  observacoes:         z.string().max(5000).optional(),
  pendenciasAcao:      z.array(pendenciaSchema).optional(),
}).superRefine((data, ctx) => {
  // Data de execucao nao pode ser futura
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (new Date(data.dataExecucao) > hoje) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataExecucao'],
      message: 'A data de execucao nao pode ser futura.',
    });
  }
});

export const testeUpdateSchema = z.object({
  dataExecucao:        z.string().optional(),
  resultado:           z.enum(RESULTADOS).optional(),
  numeroLaudo:         z.string().max(120).optional(),
  empresaExecutora:    z.string().max(200).optional(),
  responsavelNome:     z.string().max(200).optional(),
  responsavelRegistro: z.string().max(120).optional(),
  validadeMeses:       z.number().int().positive().max(120).optional(),
  observacoes:         z.string().max(5000).optional(),
  pendenciasAcao:      z.array(pendenciaSchema).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' }
);

// Soft delete exige justificativa minima.
export const testeDeleteSchema = z.object({
  motivoExclusao: z.string().min(10, 'Justifique a exclusao com pelo menos 10 caracteres.').max(1000),
});

// Atualizacao de pendencia (marcar como resolvido / observacao)
export const pendenciaUpdateSchema = z.object({
  resolvido:  z.boolean(),
  observacao: z.string().max(500).optional(),
});

// Adicionar pendencia manualmente
export const pendenciaCreateSchema = z.object({
  descricao: z.string().min(1).max(500),
});

// Ativar programa padrao para um equipamento
export const ativarProgramaSchema = z.object({
  // codigos opcionais para ativar apenas subset; vazio = todos os obrigatorios
  codigos: z.array(z.string()).optional(),
});
