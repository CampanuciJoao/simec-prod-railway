import express from 'express';
import prisma from '../services/prismaService.js';
import { startOfYear, endOfYear, differenceInMinutes } from 'date-fns';

const router = express.Router();

router.get('/indicadores', async (req, res) => {
    try {
        const inicioAno = startOfYear(new Date());
        const fimAno = endOfYear(new Date());

        const manutencoes = await prisma.manutencao.findMany({
            where: { status: 'Concluida', dataConclusao: { gte: inicioAno, lte: fimAno } },
            include: { equipamento: { include: { unidade: true } } }
        });

        const stats = {};
        manutencoes.forEach(m => {
            const id = m.equipamentoId;
            if (!stats[id]) {
                stats[id] = { modelo: m.equipamento.modelo, tag: m.equipamento.tag, unidade: m.equipamento.unidade.nomeSistema, corretivas: 0, preventivas: 0, minutosParado: 0 };
            }
            if (m.tipo === 'Corretiva') {
                stats[id].corretivas += 1;
                if (m.dataInicioReal && m.dataFimReal) {
                    const diff = differenceInMinutes(new Date(m.dataFimReal), new Date(m.dataInicioReal));
                    stats[id].minutosParado += Math.max(0, diff);
                }
            } else if (m.tipo === 'Preventiva') {
                stats[id].preventivas += 1;
            }
        });

        const lista = Object.values(stats);
        res.json({
            ano: new Date().getFullYear(),
            resumo: {
                totalPreventivas: manutencoes.filter(m => m.tipo === 'Preventiva').length,
                totalCorretivas: manutencoes.filter(m => m.tipo === 'Corretiva').length,
            },
            rankingDowntime: lista.sort((a, b) => b.minutosParado - a.minutosParado).slice(0, 10),
        });
    } catch (error) { res.status(500).json({ message: "Erro BI" }); }
});

export default router;