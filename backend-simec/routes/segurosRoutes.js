// Ficheiro: simec/backend-simec/routes/segurosRoutes.js
// VERSÃO FINAL CORRIGIDA - COM EXCLUSÃO DE ANEXOS E COBERTURAS COMPLETAS

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

// --- 1. Configuração do Multer para Upload de Apólices ---
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
const upload = multer({ storage: storage });

// --- 2. Listar todos os seguros ---
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

// --- 3. Buscar um seguro específico por ID ---
router.get('/:id', async (req, res) => {
    try {
        const seguro = await prisma.seguro.findUnique({
            where: { id: req.params.id },
            include: { anexos: true, equipamento: true, unidade: true }
        });
        if (seguro) res.json(seguro);
        else res.status(404).json({ message: 'Seguro não encontrado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhe do seguro.' });
    }
});

// --- 4. Criar um novo seguro (POST) ---
router.post('/', async (req, res) => {
    const { 
        apoliceNumero, seguradora, dataInicio, dataFim, equipamentoId, unidadeId, cobertura,
        premioTotal, lmiIncendio, lmiDanosEletricos, lmiRoubo, lmiVidros,
        lmiResponsabilidadeCivil, lmiDanosMateriais, lmiDanosCorporais,
        lmiDanosMorais, lmiAPP
    } = req.body;
    
    try {
        const novoSeguro = await prisma.seguro.create({
            data: {
                apoliceNumero,
                seguradora,
                dataInicio: new Date(dataInicio),
                dataFim: new Date(dataFim),
                cobertura,
                premioTotal: parseFloat(premioTotal) || 0,
                lmiIncendio: parseFloat(lmiIncendio) || 0,
                lmiDanosEletricos: parseFloat(lmiDanosEletricos) || 0,
                lmiRoubo: parseFloat(lmiRoubo) || 0,
                lmiVidros: parseFloat(lmiVidros) || 0,
                lmiResponsabilidadeCivil: parseFloat(lmiResponsabilidadeCivil) || 0,
                lmiDanosMateriais: parseFloat(lmiDanosMateriais) || 0,
                lmiDanosCorporais: parseFloat(lmiDanosCorporais) || 0,
                lmiDanosMorais: parseFloat(lmiDanosMorais) || 0,
                lmiAPP: parseFloat(lmiAPP) || 0,
                equipamento: equipamentoId ? { connect: { id: equipamentoId } } : undefined,
                unidade: unidadeId ? { connect: { id: unidadeId } } : undefined,
            }
        });

        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Seguro',
            entidadeId: novoSeguro.id, detalhes: `Seguro nº ${novoSeguro.apoliceNumero} criado.`
        });

        res.status(201).json(novoSeguro);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar seguro.' });
    }
});

// --- 5. Atualizar seguro existente (PUT) ---
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        equipamentoId, unidadeId, dataInicio, dataFim,
        premioTotal, lmiIncendio, lmiDanosEletricos, lmiRoubo, lmiVidros,
        lmiResponsabilidadeCivil, lmiDanosMateriais, lmiDanosCorporais,
        lmiDanosMorais, lmiAPP, ...outrosDados 
    } = req.body;

    try {
        const payload = {
            ...outrosDados,
            dataInicio: dataInicio ? new Date(dataInicio) : undefined,
            dataFim: dataFim ? new Date(dataFim) : undefined,
            premioTotal: premioTotal !== undefined ? parseFloat(premioTotal) : undefined,
            lmiIncendio: lmiIncendio !== undefined ? parseFloat(lmiIncendio) : undefined,
            lmiDanosEletricos: lmiDanosEletricos !== undefined ? parseFloat(lmiDanosEletricos) : undefined,
            lmiRoubo: lmiRoubo !== undefined ? parseFloat(lmiRoubo) : undefined,
            lmiVidros: lmiVidros !== undefined ? parseFloat(lmiVidros) : undefined,
            lmiResponsabilidadeCivil: lmiResponsabilidadeCivil !== undefined ? parseFloat(lmiResponsabilidadeCivil) : undefined,
            lmiDanosMateriais: lmiDanosMateriais !== undefined ? parseFloat(lmiDanosMateriais) : undefined,
            lmiDanosCorporais: lmiDanosCorporais !== undefined ? parseFloat(lmiDanosCorporais) : undefined,
            lmiDanosMorais: lmiDanosMorais !== undefined ? parseFloat(lmiDanosMorais) : undefined,
            lmiAPP: lmiAPP !== undefined ? parseFloat(lmiAPP) : undefined,
        };
        
        if (equipamentoId !== undefined) {
            payload.equipamento = equipamentoId ? { connect: { id: equipamentoId } } : { disconnect: true };
        }
        if (unidadeId !== undefined) {
            payload.unidade = unidadeId ? { connect: { id: unidadeId } } : { disconnect: true };
        }

        const atualizado = await prisma.seguro.update({ where: { id }, data: payload });
        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar seguro.' });
    }
});

// --- 6. Excluir seguro completo ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const seguro = await prisma.seguro.findUnique({ where: { id }, include: { anexos: true } });
        if (seguro?.anexos) {
            seguro.anexos.forEach(anexo => { if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path); });
        }
        await prisma.seguro.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir seguro.' });
    }
});

// --- 7. Upload de Documentos ---
router.post('/:id/anexos', upload.array('apolices'), async (req, res) => {
    const { id } = req.params;
    try {
        const anexosData = req.files.map(file => ({ seguroId: id, nomeOriginal: file.originalname, path: file.path, tipoMime: file.mimetype }));
        await prisma.anexo.createMany({ data: anexosData });
        const atualizado = await prisma.seguro.findUnique({ where: { id }, include: { anexos: true } });
        res.status(201).json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexo.' });
    }
});

// --- 8. EXCLUIR UM DOCUMENTO ESPECÍFICO (Esta rota corrige o erro 404) ---
router.delete('/:id/anexos/:anexoId', async (req, res) => {
    const { anexoId } = req.params;
    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
        if (anexo) {
            if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path); // Apaga arquivo físico
            await prisma.anexo.delete({ where: { id: anexoId } }); // Apaga no banco
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover documento.' });
    }
});

export default router;