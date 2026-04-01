// Ficheiro: backend-simec/validators/equipamentoValidator.js
import { z } from 'zod';

/**
 * Esquema de validação base para Equipamentos.
 * Define as regras para a CRIAÇÃO de um novo ativo.
 */
export const equipamentoSchema = z.object({
  // A 'tag' (nº de série) é obrigatória
  tag: z.string().min(2, "A Tag (Nº de Série) é obrigatória."),

  // O modelo é obrigatório
  modelo: z.string().min(1, "O modelo do equipamento é obrigatório."),

  // O ID da unidade deve ser uma string (UUID)
  unidadeId: z.string({
    required_error: "A unidade hospitalar é obrigatória.",
  }),

  // Status: Ajustado para CamelCase para bater com o Enum do Prisma
  status: z.enum(['Operante', 'Inoperante', 'EmManutencao', 'UsoLimitado'], {
    error_map: () => ({ message: "Status inválido." })
  }).default('Operante'),

  // Campos que podem vir vazios (Opcionais)
  numeroPatrimonio: z.string().nullable().optional(),
  fabricante: z.string().nullable().optional(),
  dataInstalacao: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
  setor: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  registroAnvisa: z.string().nullable().optional(),
  anoFabricacao: z.string().nullable().optional(),
});

/**
 * Esquema de validação para ATUALIZAÇÃO (Edição).
 * O .partial() faz com que todos os campos acima sejam opcionais.
 * Isso permite enviar apenas o campo 'status' isoladamente.
 */
export const equipamentoUpdateSchema = equipamentoSchema.partial();