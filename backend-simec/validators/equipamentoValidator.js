// Ficheiro: backend-simec/validators/equipamentoValidator.js
import { z } from 'zod';

/**
 * Esquema de validação para CRIAÇÃO de equipamentos.
 * Define que campos como Modelo e Tag são obrigatórios ao cadastrar.
 */
export const equipamentoSchema = z.object({
  // O Nº de Série (Tag) é obrigatório e único
  tag: z.string().min(2, "A Tag (Nº de Série) é obrigatória."),

  // O modelo deve ser informado no cadastro inicial
  modelo: z.string().min(1, "O modelo do equipamento é obrigatório."),

  // A unidade hospitalar deve ser vinculada obrigatoriamente
  unidadeId: z.string({
    required_error: "A unidade hospitalar é obrigatória.",
  }),

  // Status: Deve bater exatamente com o que está no Banco (Enum)
  status: z.enum(['Operante', 'Inoperante', 'EmManutencao', 'UsoLimitado'], {
    error_map: () => ({ message: "Status inválido." })
  }).default('Operante'),

  // Campos Opcionais: Podem ser nulos ou omitidos no formulário
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
 * Esquema de validação para ATUALIZAÇÃO (Edição/Status).
 * O comando .partial() torna todos os campos acima "opcionais".
 * Isso permite que você mude APENAS o status sem precisar enviar o modelo novamente.
 */
export const equipamentoUpdateSchema = equipamentoSchema.partial();