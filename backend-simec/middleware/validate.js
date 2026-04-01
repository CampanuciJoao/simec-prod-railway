// Ficheiro: backend-simec/middleware/validate.js

/**
 * Middleware para validar os dados recebidos no corpo da requisição (body)
 * Ele utiliza o motor de validação Zod para garantir a integridade do banco.
 */
const validate = (schema) => (req, res, next) => {
  // Executa a validação de forma segura (não interrompe o código)
  const result = schema.safeParse(req.body);

  // Se a validação falhar, interrompe e avisa o erro
  if (!result.success) {
    return res.status(400).json({ 
      error: "Erro de validação nos dados enviados", 
      detalhes: result.error.flatten().fieldErrors 
    });
  }

  // Se estiver tudo ok, guarda os dados limpos e prossegue para a rota
  req.validatedData = result.data;
  next();
};

// Exportação padrão para uso com "import validate from ..."
export default validate;