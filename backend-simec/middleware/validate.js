// Ficheiro: backend-simec/middleware/validate.js

/**
 * Middleware para validar os dados recebidos no corpo da requisição (body)
 * usando Zod. O response segue o padrao do resto do sistema:
 *   { message: string, fieldErrors: { [campo]: string } }
 * permitindo que a UI (que ja le esses campos) exiba o erro especifico em
 * vez de um toast generico.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const flat = result.error.flatten();
    // Reduz para 1 mensagem por campo (a UI espera string, nao array)
    const fieldErrors = {};
    for (const [campo, msgs] of Object.entries(flat.fieldErrors || {})) {
      if (Array.isArray(msgs) && msgs.length > 0) fieldErrors[campo] = msgs[0];
    }

    // Mensagem geral: usa o primeiro erro de campo (se houver) ou os
    // formErrors (validacoes que nao se prendem a um campo, ex: superRefine).
    const primeiraMensagemCampo = Object.values(fieldErrors)[0];
    const formErrors = Array.isArray(flat.formErrors) ? flat.formErrors : [];
    const message =
      primeiraMensagemCampo ||
      formErrors[0] ||
      'Dados invalidos.';

    return res.status(400).json({
      message,
      fieldErrors,
      // mantido para compatibilidade com clientes antigos que liam `error`/`detalhes`
      error: 'Erro de validação nos dados enviados',
      detalhes: flat.fieldErrors,
    });
  }

  req.validatedData = result.data;
  next();
};

export default validate;