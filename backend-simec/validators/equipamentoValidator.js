// Ficheiro: backend-simec/validators/equipamentoValidator.js
import { z } from 'zod';

/**
 * Este é o esquema de validação para Equipamentos.
 * Ele garante que os dados enviados pelo usuário estão no formato correto.
 */
export const equipamentoSchema = z.object({
  // A 'tag' (nº de série) é obrigatória e deve ter pelo menos 2 caracteres
  tag: z.string().min(2, "A Tag (Nº de Série) é obrigatória."),

  // O modelo é obrigatório
  modelo: z.string().min(1, "O modelo do equipamento é obrigatório."),

  // O ID da unidade deve ser uma string (o ID que vem do banco)
  unidadeId: z.string({
    required_error: "A unidade hospitalar é obrigatória.",
  }),

  // O status deve ser um desses quatro permitidos
  status: z.enum(['OPERANTE', 'INOPERANTE', 'EM_MANUTENCAO', 'USO_LIMITADO'], {
    error_map: () => ({ message: "Status inválido." })
  }),

  // Campos opcionais (podem ser vazios)
  numeroPatrimonio: z.string().nullable().optional(),
  fabricante: z.string().nullable().optional(),
  dataInstalacao: z.string().nullable().optional(), // Recebe como texto e o backend trata
  localizacao: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});