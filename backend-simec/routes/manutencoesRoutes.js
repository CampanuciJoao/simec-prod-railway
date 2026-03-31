// Ficheiro: simec/backend-simec/routes/manutencoesRoutes.js
// VERSÃO FINAL ATUALIZADA - COM INCLUSÃO DE ANEXOS NA LISTAGEM PARA O HISTÓRICO

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

// --- Configuração do Multer ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join('uploads', 'manutencoes');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });


// ==========================================================================
// ROTAS PRINCIPAIS (CRUD)
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
                anexos: true // <<< ADICIONADO: Garante que os arquivos apareçam no histórico do ativo
            },
            orderBy: { dataHoraAgendamentoInicio: 'desc' }
        });
        res.json(manutencoes);
    } catch (error) {
        console.error("Erro ao buscar manutenções:", error);
        res.status(500).json({ message: 'Erro ao buscar manutenções.', error: error.message });
    }
});

/** @route   GET /api/manutencoes/:id */
router.get('/:id', async (req, res) => {
    try {
        const manutencao = await prisma.manutencao.findUnique({
            where: { id: req.params.id },
            include: { 
                anexos: true, 
                equipamento: true, 
                notasAndamento: { 
                    orderBy: { data: 'desc' },
                    include: { autor: { select: { nome: true } } }
                } 
            }
        });
        if (manutencao) {
            res.json(manutencao);
        } else {
            res.status(404).json({ message: 'Manutenção não encontrada.' });
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes da manutenção:", error);
        res.status(500).json({ message: 'Erro ao buscar manutenção.', error: error.message });
    }
});

/** @route   POST /api/manutencoes */
router.post('/', async (req, res) => {
    const { equipamentoId, tipo, descricaoProblemaServico, dataHoraAgendamentoInicio, ...outrosDados } = req.body;
    if (!equipamentoId || !tipo || !descricaoProblemaServico || !dataHoraAgendamentoInicio) {
        return res.status(400).json({ message: 'Equipamento, Tipo, Descrição e Data de Início são obrigatórios.' });
    }
    try {
        const totalManutencoes = await prisma.manutencao.count();
        const osNumberPart = String(totalManutencoes + 1).padStart(4, '0');
        const tipoPrefix = tipo.substring(0, 1).toUpperCase();
        
        const equipamento = await prisma.equipamento.findUnique({ where: { id: equipamentoId } });
        if (!equipamento) return res.status(404).json({ message: 'Equipamento para a OS não encontrado.' });
        const tagPrefix = equipamento.tag.substring(0, 3).toUpperCase();
        
        const numeroOS = `${tipoPrefix}${tagPrefix}-${osNumberPart}`;
        const dadosParaCriar = { numeroOS, tipo, descricaoProblemaServico, dataHoraAgendamentoInicio: new Date(dataHoraAgendamentoInicio), equipamento: { connect: { id: equipamentoId } }, ...outrosDados };

        if (req.body.dataHoraAgendamentoFim) {
            dadosParaCriar.dataHoraAgendamentoFim = new Date(req.body.dataHoraAgendamentoFim);
        }

        const novaManutencao = await prisma.manutencao.create({ data: dadosParaCriar });
        
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Manutenção',
            entidadeId: novaManutencao.id, detalhes: `OS ${novaManutencao.numeroOS} foi criada para o equipamento ${equipamento.modelo}.`
        });
        res.status(201).json(novaManutencao);
    } catch (error) {
        console.error("Erro ao criar manutenção:", error);
        res.status(500).json({ message: 'Erro interno ao criar manutenção.', error: error.message });
    }
});

/** @route   PUT /api/manutencoes/:id */
router.put('/:id', async (req, res) => {
    const { id: manutencaoId } = req.params;
    const novosDados = req.body;
    const autorDaAcao = req.usuario;

    try {
        const estadoAntigo = await prisma.manutencao.findUnique({ where: { id: manutencaoId } });
        if (!estadoAntigo) return res.status(404).json({ message: 'Manutenção não encontrada.' });

        const dadosParaSalvar = {
            descricaoProblemaServico: novosDados.descricaoProblemaServico,
            tecnicoResponsavel: novosDados.tecnicoResponsavel,
            dataInicioReal: novosDados.dataInicioReal ? new Date(novosDados.dataInicioReal) : null,
            dataFimReal: novosDados.dataFimReal ? new Date(novosDados.dataFimReal) : null,
        };

        const manutencaoAtualizada = await prisma.manutencao.update({
            where: { id: manutencaoId }, data: dadosParaSalvar
        });

        const formatarValorParaLog = (valor) => {
            if (valor instanceof Date && !isNaN(valor)) return format(valor, 'dd/MM/yyyy HH:mm');
            return valor || 'vazio';
        };
        
        const camposParaComparar = {
            descricaoProblemaServico: 'Descrição',
            tecnicoResponsavel: 'Técnico Responsável',
            dataInicioReal: 'Data de Início Real',
            dataFimReal: 'Data de Fim Real'
        };

        for (const campo in camposParaComparar) {
            const valorAntigo = estadoAntigo[campo];
            const valorNovo = manutencaoAtualizada[campo];
            if (String(valorAntigo) !== String(valorNovo)) {
                await registrarLog({
                    usuarioId: autorDaAcao.id, acao: 'EDIÇÃO_CAMPO', entidade: 'Manutenção', entidadeId: manutencaoId,
                    detalhes: `O campo "${camposParaComparar[campo]}" foi alterado de "${formatarValorParaLog(valorAntigo)}" para "${formatarValorParaLog(valorNovo)}".`
                });
            }
        }

        res.json(manutencaoAtualizada);
    } catch (error) {
        console.error("Erro ao atualizar manutenção:", error);
        res.status(500).json({ message: 'Erro ao atualizar manutenção.' });
    }
});

/** @route   DELETE /api/manutencoes/:id */
router.delete('/:id', admin, async (req, res) => {
    const { id } = req.params;
    try {
        const manutencaoParaExcluir = await prisma.manutencao.findUnique({
            where: { id }, include: { anexos: true, notasAndamento: true }
        });
        if (!manutencaoParaExcluir) return res.status(404).json({ message: 'Manutenção não encontrada.' });

        (manutencaoParaExcluir.anexos || []).forEach(anexo => {
            if (anexo.path && fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
        });
        await prisma.manutencao.delete({ where: { id } });
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'EXCLUSÃO', entidade: 'Manutenção', entidadeId: id,
            detalhes: `A OS ${manutencaoParaExcluir.numeroOS} e todos os seus dados foram apagados.`
        });
        res.status(200).json({ message: 'Manutenção e seus dados associados foram excluídos com sucesso.' });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Manutenção não encontrada.' });
        res.status(500).json({ message: 'Erro ao excluir manutenção.' });
    }
});


// ==========================================================================
// ROTAS DE AÇÃO
// ==========================================================================

/** @route   POST /api/manutencoes/:id/upload */
router.post('/:id/upload', upload.array('arquivosManutencao'), async (req, res) => {
    const { id: manutencaoId } = req.params;
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    try {
        const anexosData = req.files.map(file => ({
            manutencaoId, nomeOriginal: file.originalname, path: file.path, tipoMime: file.mimetype,
        }));
        await prisma.anexo.createMany({ data: anexosData });
        
        for (const file of req.files) {
            await registrarLog({
                usuarioId: req.usuario.id, acao: 'UPLOAD_ANEXO', entidade: 'Manutenção', entidadeId: manutencaoId,
                detalhes: `Anexo "${file.originalname}" foi adicionado.`
            });
        }
        const manutencaoAtualizada = await prisma.manutencao.findUnique({
            where: { id: manutencaoId }, include: { anexos: true }
        });
        res.status(201).json(manutencaoAtualizada);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexos.', error: error.message });
    }
});

/** @route   DELETE /api/manutencoes/:id/anexos/:anexoId */
router.delete('/:id/anexos/:anexoId', async (req, res) => {
    const { id: manutencaoId, anexoId } = req.params;
    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
        if (!anexo) return res.status(404).json({ message: 'Anexo não encontrado.' });

        if (anexo.path && fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
        await prisma.anexo.delete({ where: { id: anexoId } });
        
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'EXCLUSAO_ANEXO', entidade: 'Manutenção', entidadeId: manutencaoId,
            detalhes: `Anexo "${anexo.nomeOriginal}" foi removido.`
        });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Anexo não encontrado.' });
        res.status(500).json({ message: 'Erro ao excluir anexo.' });
    }
});

/** @route   POST /api/manutencoes/:id/notas */
router.post('/:id/notas', async (req, res) => {
    const { id: manutencaoId } = req.params;
    const { nota } = req.body;
    if (!nota || typeof nota !== 'string' || nota.trim() === '') {
        return res.status(400).json({ message: 'O conteúdo da nota é obrigatório.' });
    }
    try {
        const novaNota = await prisma.notaAndamento.create({
            data: {
                nota: nota.trim(),
                manutencaoId: manutencaoId,
                autorId: req.usuario.id
            }
        });
        res.status(201).json(novaNota);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Manutenção não encontrada.' });
        res.status(500).json({ message: 'Erro ao adicionar nota.' });
    }
});

/** @route   POST /api/manutencoes/:id/concluir */
router.post('/:id/concluir', async (req, res) => {
    const { id: manutencaoId } = req.params;
    const { equipamentoOperante } = req.body;
    if (typeof equipamentoOperante !== 'boolean') {
        return res.status(400).json({ message: 'Confirmação de status do equipamento é obrigatória.' });
    }
    try {
        const manutencaoConcluida = await prisma.$transaction(async (tx) => {
            const manutencao = await tx.manutencao.update({
                where: { id: manutencaoId }, data: { status: 'Concluida', dataConclusao: new Date() }
            });
            await tx.equipamento.update({
                where: { id: manutencao.equipamentoId },
                data: { status: equipamentoOperante ? 'Operante' : 'Inoperante' }
            });
            await tx.notaAndamento.create({
                data: {
                    nota: `Manutenção concluída. Status final do equipamento: ${equipamentoOperante ? 'Operante' : 'Inoperante'}.`,
                    manutencaoId, origem: 'automatico'
                }
            });
            return manutencao;
        });
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CONCLUSAO', entidade: 'Manutenção', entidadeId: manutencaoId,
            detalhes: `OS ${manutencaoConcluida.numeroOS} foi concluída.`
        });
        res.json(manutencaoConcluida);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Manutenção ou Equipamento não encontrado.' });
        res.status(500).json({ message: 'Erro ao concluir manutenção.' });
    }
});

/** @route   POST /api/manutencoes/:id/cancelar */
router.post('/:id/cancelar', async (req, res) => {
    const { id: manutencaoId } = req.params;
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ message: "O motivo do cancelamento é obrigatório." });
    try {
        const manutencaoCancelada = await prisma.$transaction(async (tx) => {
            const man = await tx.manutencao.update({
                where: { id: manutencaoId }, data: { status: 'Cancelada' }
            });
            await tx.notaAndamento.create({
                data: { nota: `Manutenção cancelada. Motivo: ${motivo}`, manutencaoId, origem: 'automatico' }
            });
            return man;
        });
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CANCELAMENTO', entidade: 'Manutenção', entidadeId: manutencaoId,
            detalhes: `OS ${manutencaoCancelada.numeroOS} foi cancelada. Motivo: ${motivo}`
        });
        res.json(manutencaoCancelada);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Manutenção não encontrada.' });
        res.status(500).json({ message: 'Erro ao cancelar manutenção.' });
    }
});

export default router;