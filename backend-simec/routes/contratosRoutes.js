// Ficheiro: simec/backend-simec/routes/contratosRoutes.js
// VERSÃO 10.0 - COM BLINDAGEM ZOD E AUDITORIA COMPLETA

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

// --- NOVAS IMPORTAÇÕES DE SEGURANÇA ---
import validate from '../middleware/validate.js';
import { contratoSchema } from '../validators/contratoValidator.js';

const router = express.Router();

// --- 1. Configuração do Multer para Upload de Contratos ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/contratos';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// ==========================================================================
// SEÇÃO: ROTAS DE CONTRATOS (CRUD)
// ==========================================================================

/** @route   GET /api/contratos */
router.get('/', async (req, res) => {
    try {
        const contratos = await prisma.contrato.findMany({
            include: {
                unidadesCobertas: { select: { id: true, nomeSistema: true } },
                equipamentosCobertos: { select: { id: true, modelo: true, tag: true } },
                anexos: true 
            },
            orderBy: { dataFim: 'asc' }
        });
        res.json(contratos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contratos.' });
    }
});

/** @route   GET /api/contratos/:id */
router.get('/:id', async (req, res) => {
    try {
        const contrato = await prisma.contrato.findUnique({
            where: { id: req.params.id },
            include: { unidadesCobertas: true, equipamentosCobertos: true, anexos: true }
        });
        if (contrato) res.json(contrato);
        else res.status(404).json({ message: 'Contrato não encontrado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contrato.' });
    }
});

/** 
 * @route   POST /api/contratos 
 * ADICIONADO: validate(contratoSchema) para impedir contratos com dados inválidos
 */
router.post('/', validate(contratoSchema), async (req, res) => {
    const { numeroContrato, categoria, fornecedor, dataInicio, dataFim, status, unidadesCobertasIds, equipamentosCobertosIds } = req.body;
    try {
        const novoContrato = await prisma.contrato.create({
            data: {
                numeroContrato,
                categoria,
                fornecedor,
                dataInicio: new Date(dataInicio),
                dataFim: new Date(dataFim),
                status: status || 'Ativo',
                unidadesCobertas: unidadesCobertasIds?.length > 0 ? { connect: unidadesCobertasIds.map(id => ({ id })) } : undefined,
                equipamentosCobertos: equipamentosCobertosIds?.length > 0 ? { connect: equipamentosCobertosIds.map(id => ({ id })) } : undefined,
            }
        });

        await registrarLog({ 
            usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Contrato', 
            entidadeId: novoContrato.id, detalhes: `Contrato nº ${numeroContrato} (Fornecedor: ${fornecedor}) foi criado.` 
        });

        res.status(201).json(novoContrato);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ message: 'Este número de contrato já existe.' });
        res.status(500).json({ message: 'Erro ao criar contrato.' });
    }
});

/** 
 * @route   PUT /api/contratos/:id 
 * ADICIONADO: validate(contratoSchema) para validar alterações
 */
router.put('/:id', validate(contratoSchema), async (req, res) => {
    const { id } = req.params;
    const { unidadesCobertasIds, equipamentosCobertosIds, ...dadosContrato } = req.body;
    try {
        const atualizado = await prisma.contrato.update({
            where: { id },
            data: {
                ...dadosContrato,
                dataInicio: dadosContrato.dataInicio ? new Date(dadosContrato.dataInicio) : undefined,
                dataFim: dadosContrato.dataFim ? new Date(dadosContrato.dataFim) : undefined,
                unidadesCobertas: { set: unidadesCobertasIds?.map(id => ({ id })) || [] },
                equipamentosCobertos: { set: equipamentosCobertosIds?.map(id => ({ id })) || [] }
            }
        });

        await registrarLog({ 
            usuarioId: req.usuario.id, acao: 'EDIÇÃO', entidade: 'Contrato', 
            entidadeId: id, detalhes: `Contrato nº ${atualizado.numeroContrato} foi atualizado.` 
        });

        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar contrato.' });
    }
});

/** @route   DELETE /api/contratos/:id */
router.delete('/:id', admin, async (req, res) => {
    const { id } = req.params;
    try {
        const contrato = await prisma.contrato.findUnique({ where: { id }, include: { anexos: true } });
        if (!contrato) return res.status(404).json({ message: 'Contrato não encontrado.' });

        // Limpeza física dos anexos do contrato antes de excluir o registro
        if (contrato.anexos) {
            contrato.anexos.forEach(anexo => {
                if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
            });
        }

        await prisma.contrato.delete({ where: { id } });

        await registrarLog({ 
            usuarioId: req.usuario.id, acao: 'EXCLUSÃO', entidade: 'Contrato', 
            entidadeId: id, detalhes: `Contrato nº ${contrato.numeroContrato} e seus documentos excluídos.` 
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir contrato.' });
    }
});

// ============================================================
// SEÇÃO DE ANEXOS (UPLOAD E DELETE)
// ============================================================

router.post('/:id/anexos', upload.array('contratos'), async (req, res) => {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    try {
        const anexosData = req.files.map(file => ({
            contratoId: id,
            nomeOriginal: file.originalname,
            path: file.path,
            tipoMime: file.mimetype,
        }));
        
        await prisma.anexo.createMany({ data: anexosData });
        
        const atualizado = await prisma.contrato.findUnique({
            where: { id },
            include: { anexos: true }
        });
        
        res.status(201).json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar documento.' });
    }
});

router.delete('/:id/anexos/:anexoId', async (req, res) => {
    const { anexoId } = req.params;
    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
        if (anexo) {
            if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
            await prisma.anexo.delete({ where: { id: anexoId } });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover documento.' });
    }
});

export default router;