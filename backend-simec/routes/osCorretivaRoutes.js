import express from 'express';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import {
  abrirOsSchema,
  notaAndamentoSchema,
  editarNotaAndamentoSchema,
  agendarVisitaSchema,
  reagendarVisitaSchema,
  registrarResultadoSchema,
  concluirOsSchema,
  moverOsEquipamentoSchema,
} from '../validators/osCorretivaValidator.js';
import {
  listarOsCorretivasService,
  obterOsCorretivaDetalhadaService,
  abrirOsCorretivaService,
  adicionarNotaOsCorretivaService,
  editarNotaOsCorretivaService,
  agendarVisitaTerceiroService,
  reagendarVisitaTerceiroService,
  iniciarVisitaTerceiroService,
  registrarResultadoVisitaService,
  concluirOsCorretivaService,
  cancelarOsCorretivaService,
  excluirOsCorretivaService,
  moverOsEquipamentoService,
} from '../services/osCorretiva/index.js';
import {
  adaptarOsCorretivaResponse,
  adaptarListaOsCorretivasResponse,
} from '../services/osCorretivaResponseAdapter.js';
import { buscarEventosHistorico } from '../services/historicoAtivoService.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import { adicionarAnexos, removerAnexo } from '../services/uploads/anexoService.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();
router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const resultado = await listarOsCorretivasService({
      tenantId: req.tenantContext,
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
    const resultado = await buscarEventosHistorico({
      tenantId: req.tenantContext,
      referenciaId: req.params.id,
      referenciaTipo: 'os_corretiva',
      modelName: 'osCorretiva',
      query: req.query,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(resultado.data);
  } catch (error) {
    console.error('[OS_CORRETIVA_HISTORICO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar histórico.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const resultado = await obterOsCorretivaDetalhadaService({
      tenantId: req.tenantContext,
      osId: req.params.id,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar OS Corretiva.' });
  }
});

router.post('/', validate(abrirOsSchema), async (req, res) => {
  try {
    const resultado = await abrirOsCorretivaService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      dados: req.validatedData,
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

router.post('/:id/notas', validate(notaAndamentoSchema), async (req, res) => {
  try {
    const resultado = await adicionarNotaOsCorretivaService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.validatedData,
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

// Edição admin: ajustar texto e/ou data de nota já registrada.
// Útil para corrigir registros retroativos fora de ordem cronológica.
router.patch('/:id/notas/:notaId', admin, validate(editarNotaAndamentoSchema), async (req, res) => {
  try {
    const resultado = await editarNotaOsCorretivaService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      notaId: req.params.notaId,
      dados: req.validatedData,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
      });
    }
    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    console.error('[OS_CORRETIVA_NOTA_EDIT_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao editar nota.' });
  }
});

router.post('/:id/visitas', validate(agendarVisitaSchema), async (req, res) => {
  try {
    const resultado = await agendarVisitaTerceiroService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.validatedData,
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
      tenantId: req.tenantContext,
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

// Reagendar visita Agendada (imprevisto antes do tecnico chegar). Cria
// nova VisitaTerceiro com datas novas (e opcionalmente novo prestador)
// e marca a antiga como Reagendada. OS continua AguardandoTerceiro.
router.patch('/:id/visitas/:visitaId/reagendar', validate(reagendarVisitaSchema), async (req, res) => {
  try {
    const resultado = await reagendarVisitaTerceiroService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      visitaId: req.params.visitaId,
      dados: req.validatedData,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
        ...(resultado.conflito ? { conflito: resultado.conflito } : {}),
      });
    }
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_REAGENDAR_VISITA_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao reagendar visita.' });
  }
});

router.post('/:id/visitas/:visitaId/resultado', validate(registrarResultadoSchema), async (req, res) => {
  try {
    const resultado = await registrarResultadoVisitaService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      visitaId: req.params.visitaId,
      dados: req.validatedData,
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

router.post('/:id/concluir', validate(concluirOsSchema), async (req, res) => {
  try {
    const resultado = await concluirOsCorretivaService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.validatedData,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_CONCLUIR_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao concluir OS Corretiva.' });
  }
});

router.patch('/:id/equipamento', validate(moverOsEquipamentoSchema), async (req, res) => {
  try {
    const resultado = await moverOsEquipamentoService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      dados: req.validatedData,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
      });
    }
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_MOVER_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao mover OS para outro equipamento.' });
  }
});

router.post('/:id/cancelar', async (req, res) => {
  try {
    const resultado = await cancelarOsCorretivaService({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      osId: req.params.id,
      motivoCancelamento: req.body?.motivoCancelamento,
    });
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message });
    return res.json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_CANCELAR_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao cancelar OS Corretiva.' });
  }
});

// Anexos: usuario pediu poder anexar fotos/documentos durante e
// **depois de fechada** a OS. Por isso nao bloqueamos por status —
// a checagem de tenant + existencia esta no anexoPolicyService.
router.post('/:id/anexos', uploadFor('osCorretivas'), async (req, res, next) => {
  try {
    const tenantId = req.tenantContext;
    const usuarioId = req.usuario.id;
    const osId = req.params.id;

    await adicionarAnexos({
      resource: 'osCorretivas',
      tenantId,
      usuarioId,
      entityId: osId,
      files: req.files,
    });

    const resultado = await obterOsCorretivaDetalhadaService({ tenantId, osId });
    if (!resultado.ok) {
      return res.status(resultado.status).json({ message: resultado.message });
    }

    const nomes = (req.files || []).map((f) => f.originalname).join(', ');
    if (nomes) {
      await registrarLog({
        tenantId,
        usuarioId,
        acao: 'UPLOAD',
        entidade: 'OsCorretiva',
        entidadeId: osId,
        detalhes: `Anexo(s) adicionado(s) à OS ${resultado.data?.numeroOS || osId}: ${nomes}.`,
      });
    }

    return res.status(201).json(adaptarOsCorretivaResponse(resultado.data));
  } catch (error) {
    console.error('[OS_CORRETIVA_UPLOAD_ERROR]', error);
    return next(error);
  }
});

router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    const tenantId = req.tenantContext;
    const usuarioId = req.usuario.id;
    const osId = req.params.id;
    const anexoId = req.params.anexoId;

    const antes = await obterOsCorretivaDetalhadaService({ tenantId, osId });
    const anexoAntes = (antes?.data?.anexos || []).find((a) => a.id === anexoId);

    await removerAnexo({
      resource: 'osCorretivas',
      tenantId,
      usuarioId,
      entityId: osId,
      anexoId,
    });

    await registrarLog({
      tenantId,
      usuarioId,
      acao: 'EXCLUSÃO',
      entidade: 'OsCorretiva',
      entidadeId: osId,
      detalhes: `Anexo removido da OS ${antes?.data?.numeroOS || osId}: ${anexoAntes?.nomeOriginal || anexoId}.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[OS_CORRETIVA_ANEXO_DELETE_ERROR]', error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

router.delete('/:id', admin, async (req, res) => {
  try {
    const resultado = await excluirOsCorretivaService({
      tenantId: req.tenantContext,
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
