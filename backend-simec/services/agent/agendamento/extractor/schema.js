import { z } from 'zod';

export const AgendamentoSchema = z.object({
  tipoManutencao: z
    .enum(['Corretiva', 'Preventiva', 'Calibracao', 'Inspecao'])
    .nullable(),
  unidadeTexto: z.string().nullable(),
  equipamentoTexto: z.string().nullable(),
  data: z.string().nullable(),
  horaInicio: z.string().nullable(),
  horaFim: z.string().nullable(),
  numeroChamado: z.string().nullable(),
  descricao: z.string().nullable(),
  confirmacao: z.boolean().nullable(),
});
