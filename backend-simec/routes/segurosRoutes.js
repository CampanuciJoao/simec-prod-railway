// Ficheiro: simec/backend-simec/routes/segurosRoutes.js
// VERSÃO ATUALIZADA COM COBERTURAS DETALHADAS E VÍNCULOS

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
                anexos: true // Inclui anexos para sabermos se a apólice foi enviada
            },
            orderBy: { dataFim: 'asc' }
        });
        res.json(seguros);
    } catch (error) {
        console.error("Erro ao buscar seguros:", error);
        res.status(500).json({ message: 'Erro ao buscar seguros.' });
    }
});

// --- 3. Buscar um seguro específico por ID ---
router.get('/:id', async (req, res) => {
    try {
        const seguro = await prisma.seguro.findUnique({
            where: { id: req.params.id },
            include: { 
                anexos: true, 
                equipamento: true,
                unidade: true      
            }
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

// --- 4. Criar um novo seguro com coberturas (POST) ---
router.post('/', async (req, res) => {
    const { 
        apoliceNumero, seguradora, dataInicio, dataFim, equipamentoId, unidadeId, cobertura,
        premioTotal, lmiIncendio, lmiDanosEletricos, lmiRoubo, lmiVidros,
        lmiResponsabilidadeCivil, lmiDanosMateriais, lmiDanosCorporais,
        lmiDanosMorais, lmiAPP
    } = req.body;
    
    if (!apoliceNumero || !seguradora || !dataInicio || !dataFim) {
        return res.status(400).json({ message: 'Número da Apólice, Seguradora, Data de Início e Fim são obrigatórios.' });
    }

    try {
        const novoSeguro = await prisma.seguro.create({
            data: {
                apoliceNumero,
                seguradora,
                dataInicio: new Date(dataInicio),
                dataFim: new Date(dataFim),
                cobertura,
                // Valores financeiros (convertendo para número para garantir)
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
                // Vínculos
                equipamento: equipamentoId ? { connect: { id: equipamentoId } } : undefined,
                unidade: unidadeId ? { connect: { id: unidadeId } } : undefined,
            }
        });

        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'CRIAÇÃO',
            entidade: 'Seguro',
            entidadeId: novoSeguro.id,
            detalhes: `Seguro nº ${novoSeguro.apoliceNumero} criado com coberturas detalhadas.`
        });

        res.status(201).json(novoSeguro);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ message: 'Já existe uma apólice com este número.' });
        console.error('Erro ao criar seguro:', error);
        res.status(500).json({ message: 'Erro interno ao criar seguro.' });
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
        const payloadDeAtualizacao = {
            ...outrosDados,
            dataInicio: dataInicio ? new Date(dataInicio) : undefined,
            dataFim: dataFim ? new Date(dataFim) : undefined,
            // Valores financeiros
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
        
        // Gerenciamento de Vínculo
        if (equipamentoId !== undefined) {
            payloadDeAtualizacao.equipamento = equipamentoId ? { connect: { id: equipamentoId } } : { disconnect: true };
        }
        if (unidadeId !== undefined) {
            payloadDeAtualizacao.unidade = unidadeId ? { connect: { id: unidadeId } } : { disconnect: true };
        }

        const seguroAtualizado = await prisma.seguro.update({
            where: { id },
            data: payloadDeAtualizacao
        });

        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'EDIÇÃO',
            entidade: 'Seguro',
            entidadeId: id,
            detalhes: `Seguro nº ${seguroAtualizado.apoliceNumero} atualizado.`
        });

        res.json(seguroAtualizado);
    } catch (error) {
        console.error('Erro ao atualizar seguro:', error);
        res.status(500).json({ message: 'Erro ao atualizar seguro.' });
    }
});

// --- 6. Excluir seguro (DELETE) ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const seguro = await prisma.seguro.findUnique({ where: { id }, include: { anexos: true } });
        if (!seguro) return res.status(404).json({ message: 'Seguro não encontrado.' });

        // Apaga arquivos físicos dos anexos
        if (seguro.anexos) {
            seguro.anexos.forEach(anexo => {
                if (fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
            });
        }

        await prisma.seguro.delete({ where: { id } });

        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'EXCLUSÃO',
            entidade: 'Seguro',
            entidadeId: id,
            detalhes: `Seguro nº ${seguro.apoliceNumero} excluído permanentemente.`
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir seguro.' });
    }
});

// --- 7. Rota para Upload de Anexos específicos de Seguro ---
router.post('/:id/anexos', upload.array('apolices'), async (req, res) => {
    const { id: seguroId } = req.params;
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

    try {
        const anexosData = req.files.map(file => ({
            seguroId,
            nomeOriginal: file.originalname,
            path: file.path,
            tipoMime: file.mimetype,
        }));
        
        await prisma.anexo.createMany({ data: anexosData });
        
        const seguroAtualizado = await prisma.seguro.findUnique({
            where: { id: seguroId },
            include: { anexos: true }
        });
        
        res.status(201).json(seguroAtualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexo da apólice.' });
    }
});

export default router;