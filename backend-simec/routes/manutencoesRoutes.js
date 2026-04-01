// Ficheiro: simec/backend-simec/routes/manutencoesRoutes.js
// VERSÃO ATUALIZADA - CONCLUSÃO COM AUDITORIA, DATAS REAIS E REAGENDAMENTO

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';
import { format } from 'date-fns';

const router = express.Router();

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

// --- Listar manutenções ---
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
            include: { equipamento: { include: { unidade: true } }, anexos: true },
            orderBy: { dataHoraAgendamentoInicio: 'desc' }
        });
        res.json(manutencoes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar manutenções.' });
    }
});

// --- Buscar por ID ---
router.get('/:id', async (req, res) => {
    try {
        const manutencao = await prisma.manutencao.findUnique({
            where: { id: req.params.id },
            include: { 
                anexos: true, equipamento: true, 
                notasAndamento: { orderBy: { data: 'desc' }, include: { autor: { select: { nome: true } } } } 
            }
        });
        if (manutencao) res.json(manutencao);
        else res.status(404).json({ message: 'Manutenção não encontrada.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar manutenção.' });
    }
});

// --- Criar Manutenção (Agendar) ---
router.post('/', async (req, res) => {
    const { equipamentoId, tipo, descricaoProblemaServico, dataHoraAgendamentoInicio, dataHoraAgendamentoFim, ...outrosDados } = req.body;
    try {
        const total = await prisma.manutencao.count();
        const osNumber = String(total + 1).padStart(4, '0');
        const equip = await prisma.equipamento.findUnique({ where: { id: equipamentoId } });
        const tagPrefix = equip.tag.substring(0, 3).toUpperCase();
        const numeroOS = `${tipo.substring(0, 1).toUpperCase()}${tagPrefix}-${osNumber}`;

        const nova = await prisma.manutencao.create({
            data: { 
                numeroOS, tipo, 
                descricaoProblemaServico: descricaoProblemaServico || 'Manutenção Preventiva de Rotina', 
                dataHoraAgendamentoInicio: new Date(dataHoraAgendamentoInicio),
                dataHoraAgendamentoFim: dataHoraAgendamentoFim ? new Date(dataHoraAgendamentoFim) : null,
                equipamento: { connect: { id: equipamentoId } },
                ...outrosDados 
            }
        });
        await registrarLog({ usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Manutenção', entidadeId: nova.id, detalhes: `OS ${numeroOS} agendada.` });
        res.status(201).json(nova);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao agendar manutenção.' });
    }
});

// --- ROTA DE CONCLUSÃO / CONFIRMAÇÃO (REESCRITA) ---
router.post('/:id/concluir', async (req, res) => {
    const { id: manutencaoId } = req.params;
    const { equipamentoOperante, dataTerminoReal, novaPrevisao, observacao } = req.body;

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const manutAtual = await tx.manutencao.findUnique({ where: { id: manutencaoId } });
            let notaHistorico = "";

            if (equipamentoOperante) {
                // CAMINHO A: Equipamento ficou pronto
                notaHistorico = `MANUTENÇÃO CONCLUÍDA: Equipamento testado e operante. Finalizado em: ${new Date(dataTerminoReal).toLocaleString('pt-BR')}.`;
                
                await tx.manutencao.update({
                    where: { id: manutencaoId },
                    data: { 
                        status: 'Concluida', 
                        dataFimReal: new Date(dataTerminoReal), 
                        dataConclusao: new Date() 
                    }
                });

                await tx.equipamento.update({
                    where: { id: manutAtual.equipamentoId },
                    data: { status: 'Operante' }
                });

                // Apaga o alerta de confirmação, pois o ciclo fechou
                await tx.alerta.deleteMany({ where: { id: `manut-confirm-${manutencaoId}` } });

            } else {
                // CAMINHO B: Equipamento continua inoperante (Reagendamento)
                notaHistorico = `EQUIPAMENTO CONTINUA INOPERANTE: ${observacao}. Nova previsão: ${new Date(novaPrevisao).toLocaleString('pt-BR')}.`;
                
                await tx.manutencao.update({
                    where: { id: manutencaoId },
                    data: { 
                        status: 'EmAndamento', // Volta para Em Andamento
                        dataHoraAgendamentoFim: new Date(novaPrevisao) 
                    }
                });

                await tx.equipamento.update({
                    where: { id: manutAtual.equipamentoId },
                    data: { status: 'Inoperante' }
                });
            }

            // Registra a nota no histórico da OS
            await tx.notaAndamento.create({
                data: { nota: notaHistorico, manutencaoId, origem: 'automatico' }
            });

            return { status: equipamentoOperante ? 'Concluida' : 'EmAndamento' };
        });

        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CONCLUSÃO', entidade: 'Manutenção',
            entidadeId: manutencaoId, detalhes: `Decisão de conclusão registrada: Equipamento ${equipamentoOperante ? 'Operante' : 'Inoperante'}.`
        });

        res.json(resultado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao processar a finalização da manutenção.' });
    }
});

// --- Demais Rotas de Ação (Notas e Uploads) ---

router.post('/:id/notas', async (req, res) => {
    const { id } = req.params;
    try {
        const nova = await prisma.notaAndamento.create({ data: { nota: req.body.nota, manutencaoId: id, autorId: req.usuario.id } });
        res.status(201).json(nova);
    } catch (error) { res.status(500).json({ message: 'Erro ao adicionar nota.' }); }
});

router.post('/:id/upload', upload.array('arquivosManutencao'), async (req, res) => {
    const { id } = req.params;
    try {
        const anexosData = req.files.map(file => ({ manutencaoId: id, nomeOriginal: file.originalname, path: file.path, tipoMime: file.mimetype }));
        await prisma.anexo.createMany({ data: anexosData });
        res.status(201).json({ message: "Upload concluído" });
    } catch (error) { res.status(500).json({ message: 'Erro no upload.' }); }
});

router.delete('/:id', admin, async (req, res) => {
    const { id } = req.params;
    try {
        const manut = await prisma.manutencao.findUnique({ where: { id }, include: { anexos: true } });
        if (manut?.anexos) manut.anexos.forEach(a => { if (fs.existsSync(a.path)) fs.unlinkSync(a.path); });
        await prisma.manutencao.delete({ where: { id } });
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: 'Erro ao excluir.' }); }
});

export default router;