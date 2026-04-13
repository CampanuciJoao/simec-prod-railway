// Ficheiro: routes/contratosRoutes.js
// Versão: Multi-tenant HARDENED (produção)

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

import validate from '../middleware/validate.js';
import { contratoSchema } from '../validators/contratoValidator.js';

const router = express.Router();

// ==============================
// MULTER
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/contratos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

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
        anexos: true,
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
    const contrato = await prisma.contrato.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
      },
      include: {
        unidadesCobertas: true,
        equipamentosCobertos: true,
        anexos: true,
      },
    });

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
  const {
    numeroContrato,
    categoria,
    fornecedor,
    dataInicio,
    dataFim,
    status,
    unidadesCobertasIds,
    equipamentosCobertosIds,
  } = req.body;

  try {
    // valida unidades
    if (unidadesCobertasIds?.length) {
      const unidadesValidas = await prisma.unidade.findMany({
        where: {
          id: { in: unidadesCobertasIds },
          tenantId: req.usuario.tenantId,
        },
      });

      if (unidadesValidas.length !== unidadesCobertasIds.length) {
        return res.status(400).json({
          message: 'Uma ou mais unidades não pertencem ao tenant.',
        });
      }
    }

    // valida equipamentos
    if (equipamentosCobertosIds?.length) {
      const equipamentosValidos = await prisma.equipamento.findMany({
        where: {
          id: { in: equipamentosCobertosIds },
          tenantId: req.usuario.tenantId,
        },
      });

      if (equipamentosValidos.length !== equipamentosCobertosIds.length) {
        return res.status(400).json({
          message: 'Um ou mais equipamentos não pertencem ao tenant.',
        });
      }
    }

    const novo = await prisma.contrato.create({
      data: {
        tenant: {
          connect: { id: req.usuario.tenantId },
        },
        numeroContrato,
        categoria,
        fornecedor,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        status: status || 'Ativo',

        unidadesCobertas: unidadesCobertasIds?.length
          ? {
              connect: unidadesCobertasIds.map((id) => ({
                tenantId_id: {
                  tenantId: req.usuario.tenantId,
                  id,
                },
              })),
            }
          : undefined,

        equipamentosCobertos: equipamentosCobertosIds?.length
          ? {
              connect: equipamentosCobertosIds.map((id) => ({
                tenantId_id: {
                  tenantId: req.usuario.tenantId,
                  id,
                },
              })),
            }
          : undefined,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Contrato',
      entidadeId: novo.id,
      detalhes: `Contrato nº ${numeroContrato} criado.`,
    });

    return res.status(201).json(novo);
  } catch (error) {
    console.error('[CONTRATO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Número de contrato já existe.',
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
  const { unidadesCobertasIds, equipamentosCobertosIds, ...dados } = req.body;

  try {
    const contrato = await prisma.contrato.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }

    const atualizado = await prisma.contrato.update({
      where: {
        tenantId_id: {
          tenantId: req.usuario.tenantId,
          id,
        },
      },
      data: {
        ...dados,
        dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : undefined,
        dataFim: dados.dataFim ? new Date(dados.dataFim) : undefined,

        unidadesCobertas: {
          set:
            unidadesCobertasIds?.map((id) => ({
              tenantId_id: {
                tenantId: req.usuario.tenantId,
                id,
              },
            })) || [],
        },

        equipamentosCobertos: {
          set:
            equipamentosCobertosIds?.map((id) => ({
              tenantId_id: {
                tenantId: req.usuario.tenantId,
                id,
              },
            })) || [],
        },
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Contrato',
      entidadeId: id,
      detalhes: `Contrato nº ${atualizado.numeroContrato} atualizado.`,
    });

    return res.json(atualizado);
  } catch (error) {
    console.error('[CONTRATO_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar contrato.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const contrato = await prisma.contrato.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
      include: { anexos: true },
    });

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }

    contrato.anexos?.forEach((a) => {
      if (fs.existsSync(a.path)) fs.unlinkSync(a.path);
    });

    await prisma.contrato.delete({
      where: {
        tenantId_id: {
          tenantId: req.usuario.tenantId,
          id,
        },
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
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
// ==============================
router.post('/:id/anexos', upload.array('contratos'), async (req, res) => {
  const { id } = req.params;

  try {
    const contrato = await prisma.contrato.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }

    const anexosData = req.files.map((file) => ({
      tenantId: req.usuario.tenantId,
      contratoId: id,
      nomeOriginal: file.originalname,
      path: file.path,
      tipoMime: file.mimetype,
    }));

    await prisma.anexo.createMany({ data: anexosData });

    const atualizado = await prisma.contrato.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
      include: { anexos: true },
    });

    return res.status(201).json(atualizado);
  } catch (error) {
    console.error('[CONTRATO_UPLOAD_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao salvar documento.' });
  }
});

// ==============================
// DELETE ANEXO
// ==============================
router.delete('/:id/anexos/:anexoId', async (req, res) => {
  const { anexoId } = req.params;

  try {
    const anexo = await prisma.anexo.findFirst({
      where: {
        id: anexoId,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!anexo) {
      return res.status(404).json({ message: 'Anexo não encontrado.' });
    }

    if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);

    await prisma.anexo.delete({
      where: {
        id: anexoId,
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[CONTRATO_ANEXO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao remover documento.' });
  }
});

export default router;