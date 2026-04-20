import express from 'express';

import { proteger } from '../middleware/authMiddleware.js';
import {
  detalharHelpArticleService,
  listarHelpArticlesService,
} from '../services/help/helpService.js';

const router = express.Router();

router.use(proteger);

router.get('/articles', async (req, res) => {
  try {
    const items = await listarHelpArticlesService({
      categoria: req.query?.categoria,
      role: req.usuario.role,
    });
    return res.json({ items });
  } catch (error) {
    console.error('[HELP_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar artigos.' });
  }
});

router.get('/articles/:slug', async (req, res) => {
  try {
    const resultado = await detalharHelpArticleService(
      req.params.slug,
      req.usuario.role
    );
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[HELP_DETAIL_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar artigo.' });
  }
});

export default router;
