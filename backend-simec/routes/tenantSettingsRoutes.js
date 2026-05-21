import express from 'express';
import multer from 'multer';

import { proteger, admin } from '../middleware/authMiddleware.js';
import {
  atualizarTenantSettingsService,
  obterTenantSettingsService,
} from '../services/tenants/tenantService.js';
import {
  uploadLogo,
  removerLogo,
  obterLogoParaStream,
} from '../services/uploads/tenantLogoService.js';

const router = express.Router();

// Upload em memória — service valida tamanho/mimetype antes de salvar no R2.
// Limite generoso aqui (3 MB) só pra cortar arquivos absurdos antes; o
// service tem o limite real (2 MB).
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

router.use(proteger);

// /logo: GET é proteger-only (qualquer usuário do tenant pode ver o logo,
// inclusive pra exibir no header). POST/DELETE exigem admin.
router.get('/logo', async (req, res) => {
  try {
    const resultado = await obterLogoParaStream(req.tenantContext);
    if (!resultado) {
      return res.status(404).json({ message: 'Tenant sem logo configurado.' });
    }
    res.setHeader('Content-Type', resultado.mimetype || 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.end(resultado.buffer);
  } catch (error) {
    console.error('[TENANT_LOGO_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao carregar logo.' });
  }
});

router.use(admin);

router.get('/settings', async (req, res) => {
  try {
    const resultado = await obterTenantSettingsService(req.tenantContext);
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[TENANT_SETTINGS_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao carregar configuracoes.' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const resultado = await atualizarTenantSettingsService({
      tenantId: req.tenantContext,
      payload: req.body,
      autor: req.usuario,
    });

    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[TENANT_SETTINGS_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar configuracoes.' });
  }
});

router.post('/logo', logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo do logo é obrigatório (campo "logo").' });
    }
    const resultado = await uploadLogo({
      tenantId: req.tenantContext,
      file: req.file,
    });
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Arquivo excede o limite de 3 MB.' });
    }
    console.error('[TENANT_LOGO_UPLOAD_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao salvar logo.' });
  }
});

router.delete('/logo', async (req, res) => {
  try {
    const resultado = await removerLogo({ tenantId: req.tenantContext });
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[TENANT_LOGO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao remover logo.' });
  }
});

export default router;
