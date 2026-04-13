// Ficheiro: routes/segurosRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';

import validate from '../middleware/validate.js';
import { seguroSchema } from '../validators/seguroValidator.js';

const router = express.Router();

// ==============================
// MULTER
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/seguros';
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
    const seguros = await prisma.seguro.findMany({
      where: {
        tenantId: req.usuario.tenantId,
      },
      include: {
        equipamento: { select: { id: true, modelo: true, tag: true } },
        unidade: { select: { id: true, nomeSistema: true } },
        anexos: true,
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
    const seguro = await prisma.seguro.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
      },
      include: {
        anexos: true,
        equipamento: true,
        unidade: true,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    return res.json(seguro);
  } catch (error) {
    console.error('[SEGURO_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar detalhe do seguro.' });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(seguroSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  const {
    equipamentoId,
    unidadeId,
    dataInicio,
    dataFim,
    ...resto
  } = dados;

  try {
    // valida equipamento
    if (equipamentoId) {
      const equip = await prisma.equipamento.findFirst({
        where: {
          id: equipamentoId,
          tenantId: req.usuario.tenantId,
        },
      });
      if (!equip) {
        return res.status(404).json({ message: 'Equipamento inválido.' });
      }
    }

    // valida unidade
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
    }

    const novoSeguro = await prisma.seguro.create({
      data: {
        tenantId: req.usuario.tenantId,
        ...resto,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        equipamento: equipamentoId
          ? { connect: { id: equipamentoId } }
          : undefined,
        unidade: unidadeId
          ? { connect: { id: unidadeId } }
          : undefined,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Seguro',
      entidadeId: novoSeguro.id,
      detalhes: `Seguro nº ${novoSeguro.apoliceNumero} cadastrado.`,
    });

    return res.status(201).json(novoSeguro);
  } catch (error) {
    console.error('[SEGURO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este número de apólice já está cadastrado.',
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

  try {
    const seguro = await prisma.seguro.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    const atualizado = await prisma.seguro.update({
      where: { id },
      data: {
        ...dados,
        dataInicio: new Date(dados.dataInicio),
        dataFim: new Date(dados.dataFim),
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Seguro',
      entidadeId: id,
      detalhes: `Seguro nº ${atualizado.apoliceNumero} atualizado.`,
    });

    return res.json(atualizado);
  } catch (error) {
    console.error('[SEGURO_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar seguro.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const seguro = await prisma.seguro.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
      include: { anexos: true },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    seguro.anexos?.forEach((anexo) => {
      if (fs.existsSync(anexo.path)) {
        fs.unlinkSync(anexo.path);
      }
    });

    await prisma.seguro.delete({ where: { id } });

    await registrarLog({
      tenantId: req.usuario.tenantId,
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
// ==============================
router.post('/:id/anexos', upload.array('apolices'), async (req, res) => {
  const { id } = req.params;

  try {
    const seguro = await prisma.seguro.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    const anexosData = req.files.map((file) => ({
      tenantId: req.usuario.tenantId,
      seguroId: id,
      nomeOriginal: file.originalname,
      path: file.path,
      tipoMime: file.mimetype,
    }));

    await prisma.anexo.createMany({ data: anexosData });

    const atualizado = await prisma.seguro.findUnique({
      where: { id },
      include: { anexos: true },
    });

    return res.status(201).json(atualizado);
  } catch (error) {
    console.error('[SEGURO_UPLOAD_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao salvar anexo.' });
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

    if (fs.existsSync(anexo.path)) {
      fs.unlinkSync(anexo.path);
    }

    await prisma.anexo.delete({ where: { id: anexoId } });

    return res.status(204).send();
  } catch (error) {
    console.error('[SEGURO_ANEXO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao remover documento.' });
  }
});

export default router;