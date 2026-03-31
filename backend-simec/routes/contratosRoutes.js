// Ficheiro: simec/backend-simec/routes/contratosRoutes.js
// VERSÃO ATUALIZADA - COM SUPORTE A ANEXOS DIGITAIS DE CONTRATO

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- 1. Configuração do Multer para Upload de Contratos ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/contratos';
        // Cria a pasta automaticamente se ela não existir
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Gera um nome único para o arquivo para evitar substituições
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// --- 2. Listar todos os contratos (Incluindo Anexos) ---
router.get('/', async (req, res) => {
    try {
        const contratos = await prisma.contrato.findMany({
            include: {
                unidadesCobertas: { select: { id: true, nomeSistema: true } },
                equipamentosCobertos: { select: { id: true, modelo: true, tag: true } },
                anexos: true // <<< Adicionado para o frontend saber se existe documento
            },
            orderBy: { dataFim: 'asc' }
        });
        res.json(contratos);
    } catch (error) {
        console.error("Erro ao buscar contratos:", error);
        res.status(500).json({ message: 'Erro ao buscar contratos.' });
    }
});

// --- 3. Buscar contrato por ID ---
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

// --- 4. Criar novo contrato ---
router.post('/', async (req, res) => {
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
        await registrarLog({ usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Contrato', entidadeId: novoContrato.id, detalhes: `Contrato nº ${novoContrato.numeroContrato} criado.` });
        res.status(201).json(novoContrato);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar contrato.' });
    }
});

// --- 5. Atualizar contrato ---
router.put('/:id', async (req, res) => {
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
        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar contrato.' });
    }
});

// --- 6. Excluir contrato (e seus arquivos físicos) ---
router.delete('/:id', admin, async (req, res) => {
    const { id } = req.params;
    try {
        const contrato = await prisma.contrato.findUnique({ where: { id }, include: { anexos: true } });
        if (!contrato) return res.status(404).json({ message: 'Contrato não encontrado.' });

        // Apaga os arquivos do HD do servidor antes de deletar do banco
        if (contrato.anexos) {
            contrato.anexos.forEach(anexo => {
                if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
            });
        }

        await prisma.contrato.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir contrato.' });
    }
});

// ============================================================
// >>> SEÇÃO DE ANEXOS (UPLOAD E DELETE) <<<
// ============================================================

// ROTA: Subir documento do contrato
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
        console.error("Erro ao salvar anexo:", error);
        res.status(500).json({ message: 'Erro ao salvar documento no servidor.' });
    }
});

// ROTA: Remover um documento específico do contrato
router.delete('/:id/anexos/:anexoId', async (req, res) => {
    const { anexoId } = req.params;
    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
        
        if (anexo) {
            // Apaga o arquivo físico
            if (fs.existsSync(anexo.path)) {
                fs.unlinkSync(anexo.path);
            }
            // Apaga o registro no banco
            await prisma.anexo.delete({ where: { id: anexoId } });
        }
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover documento.' });
    }
});

export default router;