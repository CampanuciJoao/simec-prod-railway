import { z } from 'zod';

const precoSchema = z.object({
  valor: z.number().min(0).default(0),
  desconto: z.number().min(0).default(0),
});

const fornecedorSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome do fornecedor é obrigatório.'),
  formaPagamento: z.string().nullable().optional(),
  ordem: z.number().int().min(0),
});

const itemSchema = z.object({
  id: z.string().optional(),
  descricao: z.string().min(1, 'Descrição do item é obrigatória.'),
  data: z.string().nullable().optional(),
  ordem: z.number().int().min(0),
  isDestaque: z.boolean().default(false),
  precos: z.record(z.string(), precoSchema).optional(),
});

export const orcamentoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório.'),
  tipo: z.enum(['PRODUTO', 'SERVICO', 'MISTO'], {
    error_map: () => ({ message: 'Tipo de orçamento inválido.' }),
  }),
  observacao: z.string().nullable().optional(),
  unidadeId: z.string().nullable().optional(),
  fornecedores: z.array(fornecedorSchema).min(1, 'Pelo menos um fornecedor é obrigatório.'),
  itens: z.array(itemSchema).min(1, 'Pelo menos um item é obrigatório.'),
});

export const rejeitarSchema = z.object({
  motivoRejeicao: z.string().min(1, 'Motivo da rejeição é obrigatório.'),
});
