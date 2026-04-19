import express from 'express';

import { autenticarUsuarioService } from '../services/auth/authService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const resultado = await autenticarUsuarioService({
      username: req.body?.username,
      senha: req.body?.senha,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

export default router;
