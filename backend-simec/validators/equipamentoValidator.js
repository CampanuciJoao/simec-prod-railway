import { z } from 'zod';

const aeTitleSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return null;
    const normalized = val.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  },
  z
    .string()
    .max(16, 'AE Title deve ter no maximo 16 caracteres.')
    .regex(/^[A-Z0-9 _-]+$/, 'AE Title deve seguir o padrao DICOM.')
    .nullable()
    .optional()
);

const optionalTextSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

const fabricanteSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? toTitleCase(trimmed) : null;
  });

export const equipamentoSchema = z.object({
  tag: z.string().min(2, 'A Tag (Nº de Série) é obrigatória.'),
  modelo: z.string().min(1, 'O modelo do equipamento é obrigatório.'),
  unidadeId: z.string().min(1, 'A unidade hospitalar é obrigatória.'),

  status: z
    .enum(['Operante', 'Inoperante', 'EmManutencao', 'UsoLimitado', 'Desativado'])
    .default('Operante'),

  numeroPatrimonio: optionalTextSchema,
  fabricante: fabricanteSchema,
  dataInstalacao: optionalTextSchema,
  tipo: optionalTextSchema,
  setor: optionalTextSchema,
  observacoes: optionalTextSchema,
  registroAnvisa: optionalTextSchema,
  anoFabricacao: optionalTextSchema,
  aeTitle: aeTitleSchema,
  telefoneSuporte: optionalTextSchema,
});

export const equipamentoUpdateSchema = equipamentoSchema.partial();
