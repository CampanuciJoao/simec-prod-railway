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

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/seguros';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
    try {
        const seguros = await prisma.seguro.findMany({
            include: {
                equipamento: { select: { id: true, modelo: true, tag: true } },
                unidade: { select: { id: true, nomeSistema: true } },
                anexos: true
            },
            orderBy: { dataFim: 'asc' }
        });

        res.json(seguros);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seguros.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const seguro = await prisma.seguro.findUnique({
            where: { id: req.params.id },
            include: { anexos: true, equipamento: true, unidade: true }
        });

        if (seguro) {
            res.json(seguro);
        } else {
            res.status(404).json({ message: 'Seguro não encontrado.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhe do seguro.' });
    }
});

router.post('/', validate(seguroSchema), async (req, res) => {
    const {
        apoliceNumero,
        seguradora,
        dataInicio,
        dataFim,
        equipamentoId,
        unidadeId,
        cobertura,
        premioTotal,
        lmiIncendio,
        lmiDanosEletricos,
        lmiRoubo,
        lmiVidros,
        lmiVendaval,
        lmiResponsabilidadeCivil,
        lmiDanosMateriais,
        lmiDanosCorporais,
        lmiDanosMorais,
        lmiAPP,
        status
    } = req.body;

    try {
        const novoSeguro = await prisma.seguro.create({
            data: {
                apoliceNumero,
                seguradora,
                dataInicio: new Date(dataInicio),
                dataFim: new Date(dataFim),
                cobertura,
                status: status || 'Ativo',
                premioTotal,
                lmiIncendio,
                lmiDanosEletricos,
                lmiRoubo,
                lmiVidros,
                lmiVendaval,
                lmiResponsabilidadeCivil,
                lmiDanosMateriais,
                lmiDanosCorporais,
                lmiDanosMorais,
                lmiAPP,
                equipamento: equipamentoId ? { connect: { id: equipamentoId } } : undefined,
                unidade: unidadeId ? { connect: { id: unidadeId } } : undefined,
            }
        });

        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'CRIAÇÃO',
            entidade: 'Seguro',
            entidadeId: novoSeguro.id,
            detalhes: `Seguro nº ${novoSeguro.apoliceNumero} (${seguradora}) cadastrado.`
        });

        res.status(201).json(novoSeguro);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Este número de apólice já está cadastrado.' });
        }

        res.status(500).json({ message: 'Erro ao criar seguro.' });
    }
});

router.put('/:id', validate(seguroSchema), async (req, res) => {
    const { id } = req.params;
    const {
        equipamentoId,
        unidadeId,
        dataInicio,
        dataFim,
        ...outrosDados
    } = req.body;

    try {
        const payload = {
            ...outrosDados,
            dataInicio: new Date(dataInicio),
            dataFim: new Date(dataFim),
        };

        if (equipamentoId !== undefined) {
            payload.equipamento = equipamentoId
                ? { connect: { id: equipamentoId } }
                : { disconnect: true };
        }

        if (unidadeId !== undefined) {
            payload.unidade = unidadeId
                ? { connect: { id: unidadeId } }
                : { disconnect: true };
        }

        const atualizado = await prisma.seguro.update({
            where: { id },
            data: payload
        });

        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'EDIÇÃO',
            entidade: 'Seguro',
            entidadeId: id,
            detalhes: `Dados do seguro nº ${atualizado.apoliceNumero} foram atualizados.`
        });

        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar seguro.' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const seguro = await prisma.seguro.findUnique({
            where: { id },
            include: { anexos: true }
        });

        if (!seguro) {
            return res.status(404).json({ message: 'Seguro não encontrado.' });
        }

        if (seguro.anexos) {
            seguro.anexos.forEach((anexo) => {
                if (fs.existsSync(anexo.path)) {
                    fs.unlinkSync(anexo.path);
                }
            });
        }

        await prisma.seguro.delete({ where: { id } });

        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'EXCLUSÃO',
            entidade: 'Seguro',
            entidadeId: id,
            detalhes: `Seguro nº ${seguro.apoliceNumero} e seus documentos excluídos.`
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir seguro.' });
    }
});

router.post('/:id/anexos', upload.array('apolices'), async (req, res) => {
    const { id } = req.params;

    try {
        const anexosData = req.files.map((file) => ({
            seguroId: id,
            nomeOriginal: file.originalname,
            path: file.path,
            tipoMime: file.mimetype
        }));

        await prisma.anexo.createMany({ data: anexosData });

        const atualizado = await prisma.seguro.findUnique({
            where: { id },
            include: { anexos: true }
        });

        res.status(201).json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexo.' });
    }
});

router.delete('/:id/anexos/:anexoId', async (req, res) => {
    const { anexoId } = req.params;

    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });

        if (anexo) {
            if (fs.existsSync(anexo.path)) {
                fs.unlinkSync(anexo.path);
            }

            await prisma.anexo.delete({ where: { id: anexoId } });
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover documento.' });
    }
});

export default router;