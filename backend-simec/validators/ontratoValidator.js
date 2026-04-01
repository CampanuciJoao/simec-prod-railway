// Ficheiro: backend-simec/validators/contratoValidator.js
import { z } from 'zod';

/**
 * Regras de validação para Contratos.
 */
export const contratoSchema = z.object({
  numeroContrato: z.string().min(1, "O número do contrato é obrigatório."),
  
  fornecedor: z.string().min(1, "O nome do fornecedor é obrigatório."),
  
  categoria: z.string().nullable().optional(),

  // Validação de datas (ISO string)
  dataInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de início inválida."
  }),

  dataFim: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data de término inválida."
  }),

  status: z.enum(['Ativo', 'Expirado', 'Cancelado'], {
    error_map: () => ({ message: "Status do contrato inválido." })
  }).default('Ativo'),

  // IDs para relacionamentos (arrays de textos/UUIDs)
  unidadesCobertasIds: z.array(z.string()).optional(),
  equipamentosCobertosIds: z.array(z.string()).optional(),
});