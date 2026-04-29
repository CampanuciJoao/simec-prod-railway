import express from 'express';
import { proteger, admin } from '../middleware/authMiddleware.js';
import prisma from '../services/prismaService.js';
import {
  listarOsCorretivasService,
  obterOsCorretivaDetalhadaService,
  abrirOsCorretivaService,
  adicionarNotaOsCorretivaService,
  agendarVisitaTerceiroService,
  iniciarVisitaTerceiroService,
  registrarResultadoVisitaService,
  concluirOsCorretivaService,
  excluirOsCorretivaService,
} from '../services/osCorretiva/index.js';
import {
  adaptarOsCorretivaResponse,
  adaptarListaOsCorretivasResponse,
} from '../services/osCorretivaResponseAdapter.js';

const router = express.Router();
router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const resultado = await listarOsCorretivasService({
      tenantId: req.usuario.tenantId,
      filters: req.query,
    });
    const items = adaptarListaOsCorretivasResponse(resultado.items);
    return res.json({ ...resultado, items });
  } catch (error) {
    console.error('[OS_CORRETIVA_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar OS Corretivas.' });
  }
});

router.get('/:id/historico', async (req, res) => {
  try {
    const { tenantId } = req.usuario;
    const osId = req.params.id;

    const existe = await prisma.osCorretiva.findFirst({
      where: { tenantId, id: osId },
      select: { id: true },
    });
    if (!existe) return res.status(404).json({ message: 'OS Corretiva não encontrada.' });

    const eventos = await prisma.historicoAtivoEvento.findMany({
      where: { tenantId, referenciaId: osId, referenciaTipo: 'os_corretiva' },
      orderBy: { dataEvento: 'asc' },
      select: {
        id: true,
        tipoEvento: true,
        titulo: true,
        descricao: true,
        origem: true,
        status: true,
        metadataJson: true,
        dataEvento: true,
        createdAt: true,
      },
    });

    return res.json({ items: eventos, total: eventos.length });
  } catch (error) {
    console.error('[OS_CORRETIVA_HISTORICO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar histórico.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const resultado = await obterOsCorretivaDetalhadaService({
      tenantId: req.usuario.tenantId,
      osId: req.params.id,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar OS Corretiva.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const resultado = await abrirOsCorretivaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      dados: req.body,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
        ...(resultado.conflito ? { conflito: resultado.conflito } : {}),
      });
    }
    return res.status(resultado.status).json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao abrir OS Corretiva.' });
  }
});

router.post('/:id/notas', async (req, res) => {
  try {
    const resultado = await adicionarNotaOsCorretivaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.body,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
      });
    }
    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    console.error('[OS_CORRETIVA_NOTA_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao adicionar nota.' });
  }
});

router.post('/:id/visitas', async (req, res) => {
  try {
    const resultado = await agendarVisitaTerceiroService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.body,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
      });
    }
    return res.status(resultado.status).json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_VISITA_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao agendar visita.' });
  }
});

router.post('/:id/visitas/:visitaId/iniciar', async (req, res) => {
  try {
    const resultado = await iniciarVisitaTerceiroService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      visitaId: req.params.visitaId,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_INICIAR_VISITA_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao confirmar chegada do técnico.' });
  }
});

router.post('/:id/visitas/:visitaId/resultado', async (req, res) => {
  try {
    const resultado = await registrarResultadoVisitaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      visitaId: req.params.visitaId,
      dados: req.body,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
      });
    }
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_RESULTADO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao registrar resultado da visita.' });
  }
});

router.post('/:id/concluir', async (req, res) => {
  try {
    const resultado = await concluirOsCorretivaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.body,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_CONCLUIR_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao concluir OS Corretiva.' });
  }
});

router.delete('/:id', admin, async (req, res) => {
  try {
    const resultado = await excluirOsCorretivaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      osId: req.params.id,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.status(204).send();
  } catch (error) {
    console.error('[OS_CORRETIVA_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir OS Corretiva.' });
  }
});

export default router;
