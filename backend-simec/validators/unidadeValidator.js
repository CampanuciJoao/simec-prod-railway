// Ficheiro: backend-simec/validators/unidadeValidator.js
import { z } from 'zod';

export const unidadeSchema = z.object({
  nomeSistema: z.string().min(2, "O nome da unidade é obrigatório (mínimo 2 letras)."),
  nomeFantasia: z.string().min(2, "O nome fantasia é obrigatório."),
  
  // O CNPJ é opcional, mas se preencher, removemos pontos e traços e validamos o tamanho
  cnpj: z.string().transform(v => v.replace(/\D/g, '')).optional().nullable(),
  
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().length(2, "Use a sigla do estado (Ex: SP)").optional().nullable(),
  cep: z.string().transform(v => v.replace(/\D/g, '')).optional().nullable(),
});