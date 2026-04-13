// Ficheiro: routes/equipamentosRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

import validate from '../middleware/validate.js';
import {
  equipamentoSchema,
  equipamentoUpdateSchema,
} from '../validators/equipamentoValidator.js';

const router = express.Router();

// ==============================
// MULTER
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('uploads', 'equipamentos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const parseDate = (date) => (date ? new Date(date) : null);

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
        unidade: { select: { id: true, nomeSistema: true } },
        anexos: true,
        acessorios: true,
      },
      orderBy: { modelo: 'asc' },
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
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
      },
      include: {
        unidade: true,
        acessorios: { orderBy: { nome: 'asc' } },
        anexos: { orderBy: { createdAt: 'desc' } },
      },
    });

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
  const { dataInstalacao, unidadeId, ...dados } = req.body;

  try {
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!unidade) {
      return res.status(404).json({ message: 'Unidade inválida.' });
    }

    const patrimonio = dados.numeroPatrimonio?.trim();

    if (patrimonio && patrimonio.toLowerCase() !== 'sem patrimônio') {
      const existente = await prisma.equipamento.findFirst({
        where: {
          tenantId: req.usuario.tenantId,
          numeroPatrimonio: {
            equals: patrimonio,
            mode: 'insensitive',
          },
        },
      });

      if (existente) {
        return res.status(400).json({
          message: `Patrimônio "${patrimonio}" já existe.`,
        });
      }
    }

    const novo = await prisma.equipamento.create({
      data: {
        tenantId: req.usuario.tenantId,
        ...dados,
        unidade: {
          connect: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
              id: unidadeId,
            },
          },
        },
        dataInstalacao: parseDate(dataInstalacao),
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Equipamento',
      entidadeId: novo.id,
      detalhes: `Equipamento "${novo.modelo}" criado.`,
    });

    return res.status(201).json(novo);
  } catch (error) {
    console.error('[EQUIP_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao criar equipamento.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(equipamentoUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const { dataInstalacao, unidadeId, ...dados } = req.body;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    const dataUpdate = {
      ...dados,
      dataInstalacao: parseDate(dataInstalacao),
    };

    if (unidadeId) {
      const unidade = await prisma.unidade.findFirst({
        where: {
          id: unidadeId,
          tenantId: req.usuario.tenantId,
        },
      });

      if (!unidade) {
        return res.status(404).json({ message: 'Unidade inválida.' });
      }

      dataUpdate.unidade = {
        connect: {
          tenantId_id: {
            tenantId: req.usuario.tenantId,
            id: unidadeId,
          },
        },
      };
    }

    const atualizado = await prisma.equipamento.update({
      where: { id },
      data: dataUpdate,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Equipamento',
      entidadeId: id,
      detalhes: 'Equipamento atualizado.',
    });

    return res.json(atualizado);
  } catch (error) {
    console.error('[EQUIP_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar equipamento.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    await prisma.equipamento.delete({ where: { id } });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Equipamento',
      entidadeId: id,
      detalhes: 'Equipamento excluído.',
    });

    return res.json({ message: 'Excluído com sucesso.' });
  } catch (error) {
    console.error('[EQUIP_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir.' });
  }
});

export default router;