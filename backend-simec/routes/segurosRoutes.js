// Ficheiro: routes/segurosRoutes.js
// Versão: Multi-tenant hardened + upload centralizado

import express from 'express';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { seguroSchema } from '../validators/seguroValidator.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { deleteStoredFile } from '../services/uploads/fileStorageService.js';

const router = express.Router();

router.use(proteger);

async function buscarSeguroCompleto(tenantId, id) {
  return prisma.seguro.findFirst({
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
      equipamento: {
        select: {
          id: true,
          modelo: true,
          tag: true,
          tipo: true,
        },
      },
      unidade: {
        select: {
          id: true,
          nomeSistema: true,
          nomeFantasia: true,
          cidade: true,
          estado: true,
        },
      },
    },
  });
}

async function validarEquipamentoDoTenant(tenantId, equipamentoId) {
  if (!equipamentoId) return null;

  const equipamento = await prisma.equipamento.findFirst({
    where: {
      id: equipamentoId,
      tenantId,
    },
    select: {
      id: true,
      modelo: true,
      tag: true,
    },
  });

  if (!equipamento) {
    const error = new Error('Equipamento inválido.');
    error.status = 404;
    throw error;
  }

  return equipamento;
}

async function validarUnidadeDoTenant(tenantId, unidadeId) {
  if (!unidadeId) return null;

  const unidade = await prisma.unidade.findFirst({
    where: {
      id: unidadeId,
      tenantId,
    },
    select: {
      id: true,
      nomeSistema: true,
    },
  });

  if (!unidade) {
    const error = new Error('Unidade inválida.');
    error.status = 404;
    throw error;
  }

  return unidade;
}

// ==============================
// GET LISTAR
// ==============================
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const seguros = await prisma.seguro.findMany({
      where: { tenantId },
      include: {
        equipamento: {
          select: {
            id: true,
            modelo: true,
            tag: true,
            tipo: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nomeSistema: true,
            nomeFantasia: true,
          },
        },
        anexos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: { dataFim: 'asc' },
    });

    return res.json(seguros);
  } catch (error) {
    console.error('[SEGURO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar seguros.' });
  }
});

// ==============================
// GET POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const seguro = await buscarSeguroCompleto(tenantId, req.params.id);

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    return res.json(seguro);
  } catch (error) {
    console.error('[SEGURO_GET_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar detalhe do seguro.',
    });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(seguroSchema), async (req, res) => {
  const dados = req.validatedData || req.body;
  const { equipamentoId, unidadeId, veiculoId, dataInicio, dataFim, ...resto } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    await validarEquipamentoDoTenant(tenantId, equipamentoId);
    await validarUnidadeDoTenant(tenantId, unidadeId);

    const novoSeguro = await prisma.seguro.create({
      data: {
        ...resto,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),

        tenant: {
          connect: { id: tenantId },
        },

        equipamento: equipamentoId
          ? {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: equipamentoId,
                },
              },
            }
          : undefined,

        unidade: unidadeId
          ? {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: unidadeId,
                },
              },
            }
          : undefined,

        veiculo: veiculoId
          ? {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: veiculoId,
                },
              },
            }
          : undefined,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Seguro',
      entidadeId: novoSeguro.id,
      detalhes: `Seguro nº ${novoSeguro.apoliceNumero} cadastrado.`,
    });

    const seguroCompleto = await buscarSeguroCompleto(tenantId, novoSeguro.id);

    return res.status(201).json(seguroCompleto || novoSeguro);
  } catch (error) {
    console.error('[SEGURO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este número de apólice já está cadastrado.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao criar seguro.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(seguroSchema), async (req, res) => {
  const { id } = req.params;
  const dados = req.validatedData || req.body;
  const { equipamentoId, unidadeId, veiculoId, dataInicio, dataFim, ...resto } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const seguro = await prisma.seguro.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        apoliceNumero: true,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    await validarEquipamentoDoTenant(tenantId, equipamentoId);
    await validarUnidadeDoTenant(tenantId, unidadeId);

    const atualizado = await prisma.seguro.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        ...resto,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataFim: dataFim ? new Date(dataFim) : undefined,

        equipamento:
          equipamentoId === null
            ? { disconnect: true }
            : equipamentoId
              ? {
                  connect: {
                    tenantId_id: {
                      tenantId,
                      id: equipamentoId,
                    },
                  },
                }
              : undefined,

        unidade:
          unidadeId === null
            ? { disconnect: true }
            : unidadeId
              ? {
                  connect: {
                    tenantId_id: {
                      tenantId,
                      id: unidadeId,
                    },
                  },
                }
              : undefined,

        veiculo:
          veiculoId === null
            ? { disconnect: true }
            : veiculoId
              ? {
                  connect: {
                    tenantId_id: {
                      tenantId,
                      id: veiculoId,
                    },
                  },
                }
              : undefined,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Seguro',
      entidadeId: id,
      detalhes: `Seguro nº ${atualizado.apoliceNumero} atualizado.`,
    });

    const seguroCompleto = await buscarSeguroCompleto(tenantId, id);

    return res.json(seguroCompleto || atualizado);
  } catch (error) {
    console.error('[SEGURO_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este número de apólice já está cadastrado.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao atualizar seguro.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const seguro = await prisma.seguro.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    for (const anexo of seguro.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[SEGURO_DELETE_FILE_ERROR] seguroId=${id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await prisma.seguro.delete({
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
      entidade: 'Seguro',
      entidadeId: id,
      detalhes: `Seguro nº ${seguro.apoliceNumero} excluído.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[SEGURO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir seguro.' });
  }
});

// ==============================
// UPLOAD ANEXOS
// Campo multipart oficial do SIMEC: "file"
// ==============================
router.post('/:id/anexos', uploadFor('seguros'), async (req, res, next) => {
  try {
    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const seguroId = req.params.id;

    await adicionarAnexos({
      resource: 'seguros',
      tenantId,
      usuarioId,
      entityId: seguroId,
      files: req.files,
    });

    const atualizado = await buscarSeguroCompleto(tenantId, seguroId);

    return res.status(201).json(atualizado);
  } catch (error) {
    console.error('[SEGURO_UPLOAD_ERROR]', error);
    return next(error);
  }
});

// ==============================
// DELETE ANEXO
// ==============================
router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    await removerAnexo({
      resource: 'seguros',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[SEGURO_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

export default router;