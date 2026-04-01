// Ficheiro: backend-simec/middleware/validate.js

/**
 * Middleware para validar o corpo da requisição usando schemas do Zod.
 * Versão compatível com ES Modules (import/export).
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ 
      error: "Dados inválidos", 
      detalhes: result.error.flatten().fieldErrors 
    });
  }
  
  req.validatedData = result.data;
  next();
};

export default validate; // <<< ESTA LINHA É A CORREÇÃO