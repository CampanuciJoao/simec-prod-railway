// Rotas LGPD: documentos legais (publicos) e aceites de termos (autenticados).

import express from 'express';
import { proteger } from '../middleware/authMiddleware.js';
import {
  listarDocumentosVigentes,
  obterDocumentoVigente,
} from '../services/lgpd/documentosLegaisService.js';
import {
  registrarAceite,
  listarPendencias,
  listarHistoricoAceites,
} from '../services/lgpd/aceiteService.js';

const router = express.Router();

// ─── PUBLICO: documentos legais vigentes ─────────────────────────────────────
// GET /api/lgpd/documentos — lista versoes vigentes (sem corpo)
router.get('/documentos', (req, res) => {
  try {
    const docs = listarDocumentosVigentes().map(({ documento, versao, vigenteDesde }) => ({
      documento,
      versao,
      vigenteDesde,
    }));
    res.json({ documentos: docs });
  } catch (err) {
    console.error('[LGPD] /documentos:', err);
    res.status(500).json({ message: 'Erro ao carregar documentos legais.' });
  }
});

// GET /api/lgpd/documentos/:documento — devolve corpo do documento vigente
router.get('/documentos/:documento', (req, res) => {
  try {
    const doc = obterDocumentoVigente(req.params.documento);
    res.json(doc);
  } catch (err) {
    if (/invalido|ENOENT/i.test(err.message)) {
      return res.status(404).json({ message: 'Documento nao encontrado.' });
    }
    console.error('[LGPD] /documentos/:documento:', err);
    res.status(500).json({ message: 'Erro ao carregar documento.' });
  }
});

// ─── PROTEGIDO: aceites do usuario logado ────────────────────────────────────
router.use(proteger);

// GET /api/lgpd/aceites/pendencias — quais documentos o usuario precisa aceitar
router.get('/aceites/pendencias', async (req, res) => {
  try {
    const pendencias = await listarPendencias(req.usuario.id);
    res.json({ pendencias });
  } catch (err) {
    console.error('[LGPD] /aceites/pendencias:', err);
    res.status(500).json({ message: 'Erro ao verificar pendencias de aceite.' });
  }
});

// GET /api/lgpd/aceites/historico — historico de aceites do usuario
router.get('/aceites/historico', async (req, res) => {
  try {
    const historico = await listarHistoricoAceites(req.usuario.id);
    res.json({ historico });
  } catch (err) {
    console.error('[LGPD] /aceites/historico:', err);
    res.status(500).json({ message: 'Erro ao carregar historico de aceites.' });
  }
});

// POST /api/lgpd/aceites — registra aceite do usuario para um documento+versao
router.post('/aceites', async (req, res) => {
  const { documento, versao } = req.body || {};
  if (!documento || !versao) {
    return res.status(400).json({
      message: 'Campos "documento" e "versao" sao obrigatorios.',
    });
  }

  try {
    // Valida que a versao informada eh a vigente (evita aceitar uma
    // versao desatualizada por engano via cliente fora-do-ar).
    const vigente = obterDocumentoVigente(documento);
    if (vigente.versao !== versao) {
      return res.status(409).json({
        message: `Versao informada (${versao}) nao eh a vigente (${vigente.versao}). Recarregue a pagina.`,
        versaoVigente: vigente.versao,
      });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
    const userAgent = req.headers['user-agent'];

    const aceite = await registrarAceite({
      usuarioId: req.usuario.id,
      documento,
      versao,
      ip,
      userAgent,
    });

    res.status(201).json({ ok: true, aceite });
  } catch (err) {
    console.error('[LGPD] POST /aceites:', err);
    res.status(500).json({ message: 'Erro ao registrar aceite.' });
  }
});

export default router;
