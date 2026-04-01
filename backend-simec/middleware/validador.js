const { z } = require('zod');

// Schema para proteger a criação de Manutenções (Exemplo)
const manutencaoSchema = z.object({
  equipamentoId: z.number().int(),
  tipo: z.enum(['PREVENTIVA', 'CORRETIVA']),
  dataAgendada: z.string().datetime(), // Garante formato de data ISO
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
});

const validar = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: "Dados inválidos", 
      mensagens: error.errors.map(e => `${e.path[0]}: ${e.message}`) 
    });
  }
};

module.exports = { validar, manutencaoSchema };