// Ficheiro: routes/unidadesRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';

import validate from '../middleware/validate.js';
import { unidadeSchema } from '../validators/unidadeValidator.js';

const router = express.Router();

// ==============================
// MULTER
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/unidades';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const nomeUnico = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, nomeUnico);
  },
});

const upload = multer({ storage });

// ==============================
// GET LISTAR UNIDADES
// ==============================
router.get('/', async (req, res) => {
  try {
    const unidades = await prisma.unidade.findMany({
      where: {
        tenantId: req.usuario.tenantId,
      },
      orderBy: { nomeSistema: 'asc' },
    });

    return res.json(unidades);
  } catch (error) {
    console.error('[UNIDADE_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar unidades.' });
  }
});

// ==============================
// GET UNIDADE POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
      },
      include: { anexos: true },
    });

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
// POST CRIAR UNIDADE
// ==============================
router.post('/', validate(unidadeSchema), async (req, res) => {
  const {
    nomeSistema,
    nomeFantasia,
    cnpj,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  } = req.body;

  try {
    const novaUnidade = await prisma.unidade.create({
      data: {
        tenantId: req.usuario.tenantId,
        nomeSistema,
        nomeFantasia,
        cnpj,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Unidade',
      entidadeId: novaUnidade.id,
      detalhes: `Unidade "${novaUnidade.nomeSistema}" foi criada.`,
    });

    return res.status(201).json(novaUnidade);
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
// PUT EDITAR UNIDADE
// ==============================
router.put('/:id', validate(unidadeSchema), async (req, res) => {
  const { id } = req.params;

  try {
    const unidadeExistente = await prisma.unidade.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!unidadeExistente) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    const unidadeAtualizada = await prisma.unidade.update({
      where: { id },
      data: {
        ...req.body,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Unidade',
      entidadeId: id,
      detalhes: `Unidade "${unidadeAtualizada.nomeSistema}" foi atualizada.`,
    });

    return res.json(unidadeAtualizada);
  } catch (error) {
    console.error('[UNIDADE_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar unidade.' });
  }
});

// ==============================
// DELETE UNIDADE
// ==============================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const unidade = await prisma.unidade.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
      include: { anexos: true },
    });

    if (!unidade) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    await prisma.unidade.delete({ where: { id } });

    // remove arquivos físicos
    unidade.anexos?.forEach((anexo) => {
      if (anexo.path && fs.existsSync(anexo.path)) {
        fs.unlinkSync(anexo.path);
      }
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
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
// ANEXOS
// ==============================
router.post('/:id/anexos', upload.array('anexos'), async (req, res) => {
  const { id: unidadeId } = req.params;

  try {
    const unidade = await prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!unidade) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    const anexosData = req.files.map((file) => ({
      tenantId: req.usuario.tenantId,
      unidadeId,
      nomeOriginal: file.originalname,
      path: file.path,
      tipoMime: file.mimetype,
    }));

    await prisma.anexo.createMany({ data: anexosData });

    const unidadeAtualizada = await prisma.unidade.findUnique({
      where: { id: unidadeId },
      include: { anexos: true },
    });

    return res.status(201).json(unidadeAtualizada);
  } catch (error) {
    console.error('[ANEXO_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao salvar anexos.' });
  }
});

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

    if (anexo.path && fs.existsSync(anexo.path)) {
      fs.unlinkSync(anexo.path);
    }

    await prisma.anexo.delete({ where: { id: anexoId } });

    return res.status(204).send();
  } catch (error) {
    console.error('[ANEXO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir anexo.' });
  }
});

export default router;