// Ficheiro: backend-simec/middleware/validador.js
import { z } from 'zod';

export const manutencaoSchema = z.object({
  equipamentoId: z.string(), // IDs no seu banco são UUID (strings)
  tipo: z.enum(['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao']),
  dataAgendada: z.string(), 
  prioridade: z.enum(['Baixa', 'Media', 'Alta']),
});

export const validarRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (e) {
    return res.status(400).json({ 
      error: "Erro de validação", 
      detalhes: e.errors.map(err => ({ campo: err.path[0], mensagem: err.message })) 
    });
  }
};