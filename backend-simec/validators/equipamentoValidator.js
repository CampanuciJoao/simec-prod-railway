// Ficheiro: backend-simec/validators/equipamentoValidator.js
import { z } from 'zod';

const aeTitleSchema = z
  .string()
  .trim()
  .max(16, 'AE Title deve ter no maximo 16 caracteres.')
  .regex(/^[A-Z0-9 _-]+$/, 'AE Title deve seguir o padrao DICOM.')
  .nullable()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  });

const optionalTextSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

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
  numeroPatrimonio: optionalTextSchema,
  fabricante: optionalTextSchema,
  dataInstalacao: optionalTextSchema,
  tipo: optionalTextSchema,
  setor: optionalTextSchema,
  observacoes: optionalTextSchema,
  registroAnvisa: optionalTextSchema,
  anoFabricacao: optionalTextSchema,
  aeTitle: aeTitleSchema,
  telefoneSuporte: optionalTextSchema,
});

/**
 * Esquema de validação para ATUALIZAÇÃO (Edição/Status).
 * O comando .partial() torna todos os campos acima "opcionais".
 * Isso permite que você mude APENAS o status sem precisar enviar o modelo novamente.
 */
export const equipamentoUpdateSchema = equipamentoSchema.partial();
