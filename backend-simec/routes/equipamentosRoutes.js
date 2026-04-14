// Ficheiro: routes/equipamentosRoutes.js
// Versão: Multi-tenant hardened + upload centralizado

import express from 'express';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import {
  equipamentoSchema,
  equipamentoUpdateSchema,
} from '../validators/equipamentoValidator.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { deleteStoredFile } from '../services/uploads/fileStorageService.js';

const router = express.Router();

router.use(proteger);

function parseDate(date) {
  return date ? new Date(date) : null;
}

async function buscarEquipamentoCompleto(tenantId, id) {
  return prisma.equipamento.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      unidade: true,
      acessorios: {
        orderBy: {
          nome: 'asc',
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

async function validarUnidadeDoTenant(tenantId, unidadeId) {
  if (!unidadeId) {
    const error = new Error('Unidade inválida.');
    error.status = 404;
    throw error;
  }

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

async function validarPatrimonioUnico({
  tenantId,
  numeroPatrimonio,
  equipamentoIdIgnorar = null,
}) {
  const patrimonio = numeroPatrimonio?.trim();

  if (!patrimonio || patrimonio.toLowerCase() === 'sem patrimônio') {
    return;
  }

  const existente = await prisma.equipamento.findFirst({
    where: {
      tenantId,
      numeroPatrimonio: {
        equals: patrimonio,
        mode: 'insensitive',
      },
      ...(equipamentoIdIgnorar
        ? {
            id: {
              not: equipamentoIdIgnorar,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existente) {
    const error = new Error(`Patrimônio "${patrimonio}" já existe.`);
    error.status = 400;
    throw error;
  }
}

// ==============================
// GET LISTAR
// ==============================
router.get('/', async (req, res) => {
  try {
    const equipamentos = await prisma.equipamento.findMany({
      where: {
        tenantId: req.usuario.tenantId,
      },
      include: {
        unidade: {
          select: {
            id: true,
            nomeSistema: true,
          },
        },
        anexos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        acessorios: {
          orderBy: {
            nome: 'asc',
          },
        },
      },
      orderBy: {
        modelo: 'asc',
      },
    });

    return res.json(equipamentos);
  } catch (error) {
    console.error('[EQUIP_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar equipamentos.' });
  }
});

// ==============================
// GET POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const equipamento = await buscarEquipamentoCompleto(
      req.usuario.tenantId,
      req.params.id
    );

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    return res.json(equipamento);
  } catch (error) {
    console.error('[EQUIP_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar equipamento.' });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(equipamentoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;
  const { dataInstalacao, unidadeId, ...restante } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    await validarUnidadeDoTenant(tenantId, unidadeId);
    await validarPatrimonioUnico({
      tenantId,
      numeroPatrimonio: restante.numeroPatrimonio,
    });

    const novo = await prisma.equipamento.create({
      data: {
        ...restante,
        dataInstalacao: parseDate(dataInstalacao),

        tenant: {
          connect: {
            id: tenantId,
          },
        },

        unidade: {
          connect: {
            tenantId_id: {
              tenantId,
              id: unidadeId,
            },
          },
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Equipamento',
      entidadeId: novo.id,
      detalhes: `Equipamento "${novo.modelo}" criado.`,
    });

    const equipamentoCompleto = await buscarEquipamentoCompleto(tenantId, novo.id);

    return res.status(201).json(equipamentoCompleto || novo);
  } catch (error) {
    console.error('[EQUIP_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um equipamento com esse identificador único.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao criar equipamento.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(equipamentoUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const dados = req.validatedData || req.body;
  const { dataInstalacao, unidadeId, ...restante } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        modelo: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    if (unidadeId) {
      await validarUnidadeDoTenant(tenantId, unidadeId);
    }

    await validarPatrimonioUnico({
      tenantId,
      numeroPatrimonio: restante.numeroPatrimonio,
      equipamentoIdIgnorar: id,
    });

    const dataUpdate = {
      ...restante,
      dataInstalacao: parseDate(dataInstalacao),
    };

    if (unidadeId) {
      dataUpdate.unidade = {
        connect: {
          tenantId_id: {
            tenantId,
            id: unidadeId,
          },
        },
      };
    }

    const atualizado = await prisma.equipamento.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: dataUpdate,
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Equipamento',
      entidadeId: id,
      detalhes: `Equipamento "${atualizado.modelo}" atualizado.`,
    });

    const equipamentoCompleto = await buscarEquipamentoCompleto(tenantId, id);

    return res.json(equipamentoCompleto || atualizado);
  } catch (error) {
    console.error('[EQUIP_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um equipamento com esse identificador único.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao atualizar equipamento.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    for (const anexo of equipamento.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[EQUIP_DELETE_FILE_ERROR] equipamentoId=${id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await prisma.equipamento.delete({
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
      entidade: 'Equipamento',
      entidadeId: id,
      detalhes: `Equipamento "${equipamento.modelo}" excluído.`,
    });

    return res.json({ message: 'Excluído com sucesso.' });
  } catch (error) {
    console.error('[EQUIP_DELETE_ERROR]', error);

    if (error.code === 'P2003') {
      return res.status(409).json({
        message:
          'Não é possível excluir: equipamento possui vínculos ativos no sistema.',
      });
    }

    return res.status(500).json({ message: 'Erro ao excluir.' });
  }
});

// ==============================
// UPLOAD ANEXOS
// Campo multipart oficial do SIMEC: "file"
// ==============================
router.post(
  '/:id/anexos',
  uploadFor('equipamentos'),
  async (req, res, next) => {
    try {
      const tenantId = req.usuario.tenantId;
      const usuarioId = req.usuario.id;
      const equipamentoId = req.params.id;

      await adicionarAnexos({
        resource: 'equipamentos',
        tenantId,
        usuarioId,
        entityId: equipamentoId,
        files: req.files,
      });

      const atualizado = await buscarEquipamentoCompleto(
        tenantId,
        equipamentoId
      );

      return res.status(201).json(atualizado);
    } catch (error) {
      console.error('[EQUIP_UPLOAD_ERROR]', error);
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
      resource: 'equipamentos',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[EQUIP_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

// ==============================
// GET ACESSÓRIOS
// ==============================
router.get('/:id/acessorios', async (req, res) => {
  const equipamentoId = req.params.id;
  const tenantId = req.usuario.tenantId;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({
        message: 'Equipamento não encontrado.',
      });
    }

    const acessorios = await prisma.acessorio.findMany({
      where: {
        tenantId,
        equipamentoId,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(acessorios);
  } catch (error) {
    console.error('[ACESSORIO_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar acessórios.',
    });
  }
});

// ==============================
// POST ACESSÓRIO
// ==============================
router.post('/:id/acessorios', async (req, res) => {
  const equipamentoId = req.params.id;
  const { nome, numeroSerie, descricao } = req.body;
  const tenantId = req.usuario.tenantId;

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({
      message: 'O nome do acessório é obrigatório.',
    });
  }

  try {
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
      return res.status(404).json({
        message: 'Equipamento não encontrado.',
      });
    }

    const numeroSerieNormalizado = numeroSerie?.trim() || null;

    if (numeroSerieNormalizado) {
      const serieExistente = await prisma.acessorio.findFirst({
        where: {
          tenantId,
          numeroSerie: {
            equals: numeroSerieNormalizado,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (serieExistente) {
        return res.status(409).json({
          message: 'Já existe um acessório com este número de série.',
        });
      }
    }

    const novoAcessorio = await prisma.acessorio.create({
      data: {
        tenant: {
          connect: {
            id: tenantId,
          },
        },
        equipamento: {
          connect: {
            tenantId_id: {
              tenantId,
              id: equipamentoId,
            },
          },
        },
        nome: nome.trim(),
        numeroSerie: numeroSerieNormalizado,
        descricao: descricao?.trim() || null,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Acessório',
      entidadeId: novoAcessorio.id,
      detalhes: `Acessório "${novoAcessorio.nome}" criado para o equipamento ${equipamento.modelo} (${equipamento.tag}).`,
    });

    return res.status(201).json(novoAcessorio);
  } catch (error) {
    console.error('[ACESSORIO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um acessório com este número de série.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao criar acessório.',
    });
  }
});

// ==============================
// PUT ACESSÓRIO
// ==============================
router.put('/:id/acessorios/:acessorioId', async (req, res) => {
  const equipamentoId = req.params.id;
  const acessorioId = req.params.acessorioId;
  const { nome, numeroSerie, descricao } = req.body;
  const tenantId = req.usuario.tenantId;

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({
      message: 'O nome do acessório é obrigatório.',
    });
  }

  try {
    const acessorio = await prisma.acessorio.findFirst({
      where: {
        id: acessorioId,
        tenantId,
        equipamentoId,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!acessorio) {
      return res.status(404).json({
        message: 'Acessório não encontrado.',
      });
    }

    const numeroSerieNormalizado = numeroSerie?.trim() || null;

    if (numeroSerieNormalizado) {
      const serieExistente = await prisma.acessorio.findFirst({
        where: {
          tenantId,
          id: {
            not: acessorioId,
          },
          numeroSerie: {
            equals: numeroSerieNormalizado,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (serieExistente) {
        return res.status(409).json({
          message: 'Já existe um acessório com este número de série.',
        });
      }
    }

    const atualizado = await prisma.acessorio.update({
      where: {
        id: acessorioId,
      },
      data: {
        nome: nome.trim(),
        numeroSerie: numeroSerieNormalizado,
        descricao: descricao?.trim() || null,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Acessório',
      entidadeId: acessorioId,
      detalhes: `Acessório "${atualizado.nome}" atualizado.`,
    });

    return res.json(atualizado);
  } catch (error) {
    console.error('[ACESSORIO_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um acessório com este número de série.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao atualizar acessório.',
    });
  }
});

// ==============================
// DELETE ACESSÓRIO
// ==============================
router.delete('/:id/acessorios/:acessorioId', async (req, res) => {
  const equipamentoId = req.params.id;
  const acessorioId = req.params.acessorioId;
  const tenantId = req.usuario.tenantId;

  try {
    const acessorio = await prisma.acessorio.findFirst({
      where: {
        id: acessorioId,
        tenantId,
        equipamentoId,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!acessorio) {
      return res.status(404).json({
        message: 'Acessório não encontrado.',
      });
    }

    await prisma.acessorio.delete({
      where: {
        id: acessorioId,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Acessório',
      entidadeId: acessorioId,
      detalhes: `Acessório "${acessorio.nome}" excluído.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[ACESSORIO_DELETE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao excluir acessório.',
    });
  }
});

export default router;