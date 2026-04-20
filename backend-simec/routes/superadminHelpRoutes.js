import express from 'express';

import { proteger, superadmin } from '../middleware/authMiddleware.js';
import {
  atualizarHelpArticleService,
  criarHelpArticleService,
  listarHelpArticlesAdminService,
} from '../services/help/helpService.js';

const router = express.Router();

router.use(proteger);
router.use(superadmin);

router.get('/articles', async (req, res) => {
  try {
    const items = await listarHelpArticlesAdminService();
    return res.json({ items });
  } catch (error) {
    console.error('[SUPERADMIN_HELP_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar artigos.' });
  }
});

router.post('/articles', async (req, res) => {
  try {
    const resultado = await criarHelpArticleService(req.body);
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_HELP_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao criar artigo.' });
  }
});

router.put('/articles/:id', async (req, res) => {
  try {
    const resultado = await atualizarHelpArticleService(req.params.id, req.body);
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_HELP_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar artigo.' });
  }
});

export default router;
