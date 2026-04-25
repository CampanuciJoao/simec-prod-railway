import express from 'express';

import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { manutencaoSchema } from '../validators/manutencaoValidator.js';

import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { deleteStoredFile } from '../services/uploads/fileStorageService.js';

import {
  listarManutencoesService,
  obterManutencaoDetalhadaService,
  criarManutencaoService,
  atualizarManutencaoService,
  adicionarNotaManutencaoService,
  concluirManutencaoComAcaoService,
  excluirManutencaoService,
} from '../services/manutencao/index.js';

import { buscarManutencaoPorId, deletarManutencao } from '../services/manutencao/manutencaoRepository.js';
import { adaptarManutencaoResponse } from '../services/manutencaoResponseAdapter.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const data = await listarManutencoesService({
      tenantId: req.usuario.tenantId,
      filters: req.query,
    });

    return res.json(data);
  } catch (error) {
    console.error('[MANUTENCAO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar manutenções.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const resultado = await obterManutencaoDetalhadaService({
      tenantId: req.usuario.tenantId,
      manutencaoId: req.params.id,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    return res.json(resultado.data);
  } catch (error) {
    console.error('[MANUTENCAO_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
  }
});

router.post('/', validate(manutencaoSchema), async (req, res) => {
  try {
    const resultado = await criarManutencaoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      dados: req.validatedData || req.body,
      statusEquipamento: req.body?.statusEquipamento || null,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.conflito ? { conflito: resultado.conflito } : {}),
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
        ...(resultado.missingFields ? { missingFields: resultado.missingFields } : {}),
      });
    }

    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    console.error('[MANUTENCAO_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao agendar manutenção.' });
  }
});

router.put('/:id', validate(manutencaoSchema), async (req, res) => {
  try {
    const resultado = await atualizarManutencaoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      manutencaoId: req.params.id,
      dados: req.validatedData || req.body,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
        ...(resultado.conflito ? { conflito: resultado.conflito } : {}),
        ...(resultado.fieldErrors ? { fieldErrors: resultado.fieldErrors } : {}),
        ...(resultado.missingFields ? { missingFields: resultado.missingFields } : {}),
      });
    }

    return res.json(resultado.data);
  } catch (error) {
    console.error('[MANUTENCAO_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar manutenção.' });
  }
});

router.post('/:id/notas', async (req, res) => {
  try {
    const resultado = await adicionarNotaManutencaoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      manutencaoId: req.params.id,
      nota: req.body?.nota,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    console.error('[MANUTENCAO_NOTA_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao adicionar nota.' });
  }
});

router.post('/:id/concluir', async (req, res) => {
  try {
    const resultado = await concluirManutencaoComAcaoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      manutencaoId: req.params.id,
      acao: req.body?.acao,
      dataTerminoReal: req.body?.dataTerminoReal,
      novaPrevisao: req.body?.novaPrevisao,
      observacao: req.body?.observacao,
      manutencaoRealizada: req.body?.manutencaoRealizada,
      equipamentoOperante: req.body?.equipamentoOperante,
      // campos para agendar_visita
      agendamentoDataInicioLocal: req.body?.agendamentoDataInicioLocal,
      agendamentoHoraInicioLocal: req.body?.agendamentoHoraInicioLocal,
      agendamentoDataFimLocal: req.body?.agendamentoDataFimLocal,
      agendamentoHoraFimLocal: req.body?.agendamentoHoraFimLocal,
      numeroChamado: req.body?.numeroChamado,
      tecnicoResponsavel: req.body?.tecnicoResponsavel,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    return res.json(resultado.data);
  } catch (error) {
    console.error('[MANUTENCAO_CONCLUIR_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao processar o desfecho da manutenção.',
    });
  }
});

router.post('/:id/anexos', uploadFor('manutencoes'), async (req, res, next) => {
  try {
    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const manutencaoId = req.params.id;

    await adicionarAnexos({
      resource: 'manutencoes',
      tenantId,
      usuarioId,
      entityId: manutencaoId,
      files: req.files,
    });

    const atualizada = await buscarManutencaoPorId({
      tenantId,
      manutencaoId,
    });

    return res.status(201).json(adaptarManutencaoResponse(atualizada));
  } catch (error) {
    console.error('[MANUTENCAO_UPLOAD_ERROR]', error);
    return next(error);
  }
});

router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    await removerAnexo({
      resource: 'manutencoes',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[MANUTENCAO_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

router.delete('/:id', admin, async (req, res) => {
  try {
    const resultado = await excluirManutencaoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      manutencaoId: req.params.id,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    const { manut } = resultado;

    for (const anexo of manut.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[MANUTENCAO_DELETE_FILE_ERROR] manutencaoId=${req.params.id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await deletarManutencao({
      tenantId: req.usuario.tenantId,
      manutencaoId: req.params.id,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Manutenção',
      entidadeId: req.params.id,
      detalhes: `Manutenção "${manut.numeroOS}" excluída.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[MANUTENCAO_DELETE_ERROR]', error);

    if (error.code === 'P2003') {
      return res.status(409).json({
        message:
          'Não é possível excluir: manutenção possui vínculos ativos no sistema.',
      });
    }

    return res.status(500).json({ message: 'Erro ao excluir manutenção.' });
  }
});

export default router;
