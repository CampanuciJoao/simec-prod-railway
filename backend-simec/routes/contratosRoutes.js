// Ficheiro: routes/contratosRoutes.js
// Versão: Multi-tenant hardened + upload centralizado

import express from 'express';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { contratoSchema } from '../validators/contratoValidator.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { deleteStoredFile } from '../services/uploads/fileStorageService.js';

const router = express.Router();

async function validarUnidadesDoTenant(tenantId, unidadesCobertasIds = []) {
  if (!Array.isArray(unidadesCobertasIds) || unidadesCobertasIds.length === 0) {
    return;
  }

  const unidadesValidas = await prisma.unidade.findMany({
    where: {
      id: { in: unidadesCobertasIds },
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (unidadesValidas.length !== unidadesCobertasIds.length) {
    const error = new Error('Uma ou mais unidades não pertencem ao tenant.');
    error.status = 400;
    throw error;
  }
}

async function validarEquipamentosDoTenant(
  tenantId,
  equipamentosCobertosIds = []
) {
  if (
    !Array.isArray(equipamentosCobertosIds) ||
    equipamentosCobertosIds.length === 0
  ) {
    return;
  }

  const equipamentosValidos = await prisma.equipamento.findMany({
    where: {
      id: { in: equipamentosCobertosIds },
      tenantId,
    },
    select: {
      id: true,
    },
  });

  if (equipamentosValidos.length !== equipamentosCobertosIds.length) {
    const error = new Error(
      'Um ou mais equipamentos não pertencem ao tenant.'
    );
    error.status = 400;
    throw error;
  }
}

async function buscarContratoCompleto(tenantId, id) {
  return prisma.contrato.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      unidadesCobertas: {
        select: {
          id: true,
          nomeSistema: true,
        },
      },
      equipamentosCobertos: {
        select: {
          id: true,
          modelo: true,
          tag: true,
        },
      },
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
    const contratos = await prisma.contrato.findMany({
      where: {
        tenantId: req.usuario.tenantId,
      },
      include: {
        unidadesCobertas: {
          select: { id: true, nomeSistema: true },
        },
        equipamentosCobertos: {
          select: { id: true, modelo: true, tag: true },
        },
        anexos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: { dataFim: 'asc' },
    });

    return res.json(contratos);
  } catch (error) {
    console.error('[CONTRATO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar contratos.' });
  }
});

// ==============================
// GET POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const contrato = await buscarContratoCompleto(
      req.usuario.tenantId,
      req.params.id
    );

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }

    return res.json(contrato);
  } catch (error) {
    console.error('[CONTRATO_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar contrato.' });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(contratoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  const {
    numeroContrato,
    categoria,
    fornecedor,
    dataInicio,
    dataFim,
    status,
    unidadesCobertasIds,
    equipamentosCobertosIds,
  } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    await validarUnidadesDoTenant(tenantId, unidadesCobertasIds);
    await validarEquipamentosDoTenant(tenantId, equipamentosCobertosIds);

    const novo = await prisma.contrato.create({
      data: {
        tenant: {
          connect: { id: tenantId },
        },
        numeroContrato,
        categoria,
        fornecedor,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        status: status || 'Ativo',

        unidadesCobertas: Array.isArray(unidadesCobertasIds)
          ? {
              connect: unidadesCobertasIds.map((id) => ({
                tenantId_id: {
                  tenantId,
                  id,
                },
              })),
            }
          : undefined,

        equipamentosCobertos: Array.isArray(equipamentosCobertosIds)
          ? {
              connect: equipamentosCobertosIds.map((id) => ({
                tenantId_id: {
                  tenantId,
                  id,
                },
              })),
            }
          : undefined,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Contrato',
      entidadeId: novo.id,
      detalhes: `Contrato nº ${numeroContrato} criado.`,
    });

    const contratoCompleto = await buscarContratoCompleto(tenantId, novo.id);

    return res.status(201).json(contratoCompleto || novo);
  } catch (error) {
    console.error('[CONTRATO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Número de contrato já existe.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao criar contrato.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(contratoSchema), async (req, res) => {
  const { id } = req.params;
  const dados = req.validatedData || req.body;
  const { unidadesCobertasIds, equipamentosCobertosIds, ...restante } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const contrato = await prisma.contrato.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        numeroContrato: true,
      },
    });

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }

    await validarUnidadesDoTenant(tenantId, unidadesCobertasIds);
    await validarEquipamentosDoTenant(tenantId, equipamentosCobertosIds);

    const atualizado = await prisma.contrato.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        ...restante,
        dataInicio: restante.dataInicio
          ? new Date(restante.dataInicio)
          : undefined,
        dataFim: restante.dataFim ? new Date(restante.dataFim) : undefined,

        unidadesCobertas: {
          set: Array.isArray(unidadesCobertasIds)
            ? unidadesCobertasIds.map((unidadeId) => ({
                tenantId_id: {
                  tenantId,
                  id: unidadeId,
                },
              }))
            : [],
        },

        equipamentosCobertos: {
          set: Array.isArray(equipamentosCobertosIds)
            ? equipamentosCobertosIds.map((equipamentoId) => ({
                tenantId_id: {
                  tenantId,
                  id: equipamentoId,
                },
              }))
            : [],
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Contrato',
      entidadeId: id,
      detalhes: `Contrato nº ${atualizado.numeroContrato} atualizado.`,
    });

    const contratoCompleto = await buscarContratoCompleto(tenantId, id);

    return res.json(contratoCompleto || atualizado);
  } catch (error) {
    console.error('[CONTRATO_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Número de contrato já existe.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao atualizar contrato.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const tenantId = req.usuario.tenantId;

    const contrato = await prisma.contrato.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }

    for (const anexo of contrato.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[CONTRATO_DELETE_FILE_ERROR] contratoId=${id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await prisma.contrato.delete({
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
      entidade: 'Contrato',
      entidadeId: id,
      detalhes: `Contrato nº ${contrato.numeroContrato} excluído.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[CONTRATO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir contrato.' });
  }
});

// ==============================
// UPLOAD ANEXOS
// Campo multipart oficial do SIMEC: "file"
// ==============================
router.post(
  '/:id/anexos',
  uploadFor('contratos'),
  async (req, res, next) => {
    try {
      const tenantId = req.usuario.tenantId;
      const usuarioId = req.usuario.id;
      const contratoId = req.params.id;

      await adicionarAnexos({
        resource: 'contratos',
        tenantId,
        usuarioId,
        entityId: contratoId,
        files: req.files,
      });

      const atualizado = await buscarContratoCompleto(tenantId, contratoId);

      return res.status(201).json(atualizado);
    } catch (error) {
      console.error('[CONTRATO_UPLOAD_ERROR]', error);
      return next(error);
    }
  }
);

// ==============================
// DELETE ANEXO
// ==============================
router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    await removerAnexo({
      resource: 'contratos',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[CONTRATO_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

export default router;