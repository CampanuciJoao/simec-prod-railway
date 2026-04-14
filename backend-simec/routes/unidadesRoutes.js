// Ficheiro: routes/unidadesRoutes.js
// Versão: Multi-tenant hardened + upload centralizado

import express from 'express';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { unidadeSchema } from '../validators/unidadeValidator.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { deleteStoredFile } from '../services/uploads/fileStorageService.js';

const router = express.Router();

router.use(proteger);

async function buscarUnidadeCompleta(tenantId, id) {
  return prisma.unidade.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      anexos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

// ==============================
// GET LISTAR
// ==============================
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const unidades = await prisma.unidade.findMany({
      where: { tenantId },
      orderBy: { nomeSistema: 'asc' },
    });

    return res.json(unidades);
  } catch (error) {
    console.error('[UNIDADE_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar unidades.' });
  }
});

// ==============================
// GET POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const unidade = await buscarUnidadeCompleta(tenantId, req.params.id);

    if (!unidade) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    return res.json(unidade);
  } catch (error) {
    console.error('[UNIDADE_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar unidade.' });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(unidadeSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  try {
    const tenantId = req.usuario.tenantId;

    const novaUnidade = await prisma.unidade.create({
      data: {
        ...dados,
        tenant: {
          connect: { id: tenantId },
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Unidade',
      entidadeId: novaUnidade.id,
      detalhes: `Unidade "${novaUnidade.nomeSistema}" foi criada.`,
    });

    const unidadeCompleta = await buscarUnidadeCompleta(tenantId, novaUnidade.id);

    return res.status(201).json(unidadeCompleta || novaUnidade);
  } catch (error) {
    console.error('[UNIDADE_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe uma unidade com este Nome ou CNPJ.',
      });
    }

    return res.status(500).json({ message: 'Erro ao criar unidade.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(unidadeSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;
  const dados = req.validatedData || req.body;

  try {
    const unidadeExistente = await prisma.unidade.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        nomeSistema: true,
      },
    });

    if (!unidadeExistente) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    const unidadeAtualizada = await prisma.unidade.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        ...dados,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Unidade',
      entidadeId: id,
      detalhes: `Unidade "${unidadeAtualizada.nomeSistema}" foi atualizada.`,
    });

    const unidadeCompleta = await buscarUnidadeCompleta(tenantId, id);

    return res.json(unidadeCompleta || unidadeAtualizada);
  } catch (error) {
    console.error('[UNIDADE_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe uma unidade com este Nome ou CNPJ.',
      });
    }

    return res.status(500).json({ message: 'Erro ao atualizar unidade.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const unidade = await prisma.unidade.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!unidade) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    for (const anexo of unidade.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[UNIDADE_DELETE_FILE_ERROR] unidadeId=${id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await prisma.unidade.delete({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Unidade',
      entidadeId: id,
      detalhes: `Unidade "${unidade.nomeSistema}" foi excluída.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[UNIDADE_DELETE_ERROR]', error);

    if (error.code === 'P2003') {
      return res.status(409).json({
        message: 'Não é possível excluir: unidade possui equipamentos vinculados.',
      });
    }

    return res.status(500).json({ message: 'Erro ao excluir unidade.' });
  }
});

// ==============================
// UPLOAD ANEXOS
// Campo multipart oficial do SIMEC: "file"
// ==============================
router.post('/:id/anexos', uploadFor('unidades'), async (req, res, next) => {
  try {
    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const unidadeId = req.params.id;

    await adicionarAnexos({
      resource: 'unidades',
      tenantId,
      usuarioId,
      entityId: unidadeId,
      files: req.files,
    });

    const unidadeAtualizada = await buscarUnidadeCompleta(tenantId, unidadeId);

    return res.status(201).json(unidadeAtualizada);
  } catch (error) {
    console.error('[UNIDADE_UPLOAD_ERROR]', error);
    return next(error);
  }
});

// ==============================
// DELETE ANEXO
// ==============================
router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    await removerAnexo({
      resource: 'unidades',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[UNIDADE_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

export default router;