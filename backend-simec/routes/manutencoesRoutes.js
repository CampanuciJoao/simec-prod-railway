// Ficheiro: simec/backend-simec/routes/manutencoesRoutes.js
// VERSÃO 12.0 - ADICIONADA ROTA DE CANCELAMENTO

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

// --- IMPORTAÇÕES DE SEGURANÇA ---
import validate from '../middleware/validate.js';
import { manutencaoSchema } from '../validators/manutencaoValidator.js';

const router = express.Router();

// --- Configuração do Multer (Upload de Arquivos) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join('uploads', 'manutencoes');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });


// ==========================================================================
// SEÇÃO: ROTAS DE CONSULTA E CRIAÇÃO (CRUD)
// ==========================================================================

/** @route   GET /api/manutencoes */
router.get('/', async (req, res) => {
    const { equipamentoId, unidadeId, tipo, status } = req.query;
    try {
        const whereClause = {};
        if (equipamentoId) whereClause.equipamentoId = equipamentoId;
        if (tipo) whereClause.tipo = tipo;
        if (status) whereClause.status = status;
        if (unidadeId) whereClause.equipamento = { unidadeId: unidadeId };

        const manutencoes = await prisma.manutencao.findMany({
            where: whereClause,
            include: { 
                equipamento: { include: { unidade: true } }, 
                anexos: true 
            },
            orderBy: { dataHoraAgendamentoInicio: 'desc' }
        });
        res.json(manutencoes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar manutenções.' });
    }
});

/** @route   GET /api/manutencoes/:id */
router.get('/:id', async (req, res) => {
    try {
        const manutencao = await prisma.manutencao.findUnique({
            where: { id: req.params.id },
            include: { 
                anexos: true, 
                equipamento: {
                    include: { unidade: true }
                }, 
                notasAndamento: { 
                    orderBy: { data: 'desc' },
                    include: { autor: { select: { nome: true } } }
                } 
            }
        });
        if (manutencao) res.json(manutencao);
        else res.status(404).json({ message: 'Manutenção não encontrada.' });
    } catch (error) {
        console.error("Erro ao buscar detalhes da manutenção:", error);
        res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
});

/** @route   POST /api/manutencoes */
router.post('/', validate(manutencaoSchema), async (req, res) => {
    const { equipamentoId, tipo, descricaoProblemaServico, dataHoraAgendamentoInicio, dataHoraAgendamentoFim, ...outrosDados } = req.body;
    
    try {
        const total = await prisma.manutencao.count();
        const osNumber = String(total + 1).padStart(4, '0');
        
        const equip = await prisma.equipamento.findUnique({ where: { id: equipamentoId } });
        if (!equip) return res.status(404).json({ message: "Equipamento não encontrado." });
        
        const tagPrefix = equip.tag.substring(0, 3).toUpperCase();
        const numeroOS = `${tipo.substring(0, 1).toUpperCase()}${tagPrefix}-${osNumber}`;

        const nova = await prisma.manutencao.create({
            data: { 
                numeroOS, 
                tipo, 
                descricaoProblemaServico, 
                dataHoraAgendamentoInicio: new Date(dataHoraAgendamentoInicio),
                dataHoraAgendamentoFim: dataHoraAgendamentoFim ? new Date(dataHoraAgendamentoFim) : null,
                equipamento: { connect: { id: equipamentoId } },
                ...outrosDados 
            }
        });

        await registrarLog({ 
            usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Manutenção', 
            entidadeId: nova.id, detalhes: `OS ${numeroOS} agendada para ${equip.modelo}.` 
        });

        res.status(201).json(nova);
    } catch (error) {
        console.error("Erro no POST manutenção:", error);
        res.status(500).json({ message: 'Erro ao agendar manutenção.' });
    }
});


// ==========================================================================
// ROTA DE CONCLUSÃO
// ==========================================================================

router.post('/:id/concluir', async (req, res) => {
    const { id: manutencaoId } = req.params;
    const { equipamentoOperante, dataTerminoReal, novaPrevisao, observacao } = req.body;

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const manutAtual = await tx.manutencao.findUnique({ where: { id: manutencaoId } });
            let notaHistorico = "";

            if (equipamentoOperante) {
                notaHistorico = `MANUTENÇÃO CONCLUÍDA: Equipamento Operante. Término: ${new Date(dataTerminoReal).toLocaleString('pt-BR')}.`;
                await tx.manutencao.update({
                    where: { id: manutencaoId },
                    data: { status: 'Concluida', dataFimReal: new Date(dataTerminoReal), dataConclusao: new Date() }
                });
                await tx.equipamento.update({ where: { id: manutAtual.equipamentoId }, data: { status: 'Operante' } });
                await tx.alerta.deleteMany({ where: { id: `manut-confirm-${manutencaoId}` } });
            } else {
                notaHistorico = `EQUIPAMENTO CONTINUA INOPERANTE: ${observacao}. Nova previsão: ${new Date(novaPrevisao).toLocaleString('pt-BR')}.`;
                await tx.manutencao.update({
                    where: { id: manutencaoId },
                    data: { status: 'EmAndamento', dataHoraAgendamentoFim: new Date(novaPrevisao) }
                });
                await tx.equipamento.update({ where: { id: manutAtual.equipamentoId }, data: { status: 'Inoperante' } });
            }
            await tx.notaAndamento.create({ data: { nota: notaHistorico, manutencaoId, origem: 'automatico' } });
            return { status: equipamentoOperante ? 'Concluida' : 'EmAndamento' };
        });

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao processar a finalização.' });
    }
});

// ==========================================================================
// ROTA DE CANCELAMENTO (ADICIONADA)
// ==========================================================================

router.post('/:id/cancelar', async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) return res.status(400).json({ message: "O motivo do cancelamento é obrigatório." });

    try {
        await prisma.$transaction(async (tx) => {
            await tx.manutencao.update({ where: { id }, data: { status: 'Cancelada' } });
            await tx.notaAndamento.create({
                data: { nota: `CANCELAMENTO: ${motivo}`, manutencaoId: id, origem: 'manual' }
            });
        });
        res.json({ message: "Manutenção cancelada com sucesso." });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao cancelar manutenção.' });
    }
});


// ==========================================================================
// OUTRAS AÇÕES
// ==========================================================================

router.post('/:id/notas', async (req, res) => {
    try {
        const nova = await prisma.notaAndamento.create({ 
            data: { nota: req.body.nota, manutencaoId: req.params.id, autorId: req.usuario.id } 
        });
        res.status(201).json(nova);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar nota.' });
    }
});

router.post('/:id/upload', upload.array('arquivosManutencao'), async (req, res) => {
    try {
        const anexosData = req.files.map(file => ({
            manutencaoId: req.params.id, nomeOriginal: file.originalname, path: file.path, tipoMime: file.mimetype,
        }));
        await prisma.anexo.createMany({ data: anexosData });
        res.status(201).json({ message: "Arquivos salvos com sucesso." });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexos.' });
    }
});

router.delete('/:id', admin, async (req, res) => {
    const { id } = req.params;
    try {
        const manut = await prisma.manutencao.findUnique({ where: { id }, include: { anexos: true } });
        if (!manut) return res.status(404).json({ message: 'Não encontrada.' });
        if (manut.anexos) manut.anexos.forEach(a => { if (fs.existsSync(a.path)) fs.unlinkSync(a.path); });
        await prisma.manutencao.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir manutenção.' });
    }
});

export default router;