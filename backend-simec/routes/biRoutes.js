import express from 'express';
import prisma from '../services/prismaService.js';
import { startOfYear, endOfYear, differenceInHours } from 'date-fns';

const router = express.Router();

router.get('/indicadores', async (req, res) => {
    try {
        const agora = new Date();
        const inicioAno = startOfYear(agora);
        const fimAno = endOfYear(agora);

        const manutencoes = await prisma.manutencao.findMany({
            where: {
                status: 'Concluida',
                dataConclusao: { gte: inicioAno, lte: fimAno }
            },
            include: { equipamento: { include: { unidade: true } } }
        });

        const stats = {};

        manutencoes.forEach(m => {
            const id = m.equipamentoId;
            if (!stats[id]) {
                stats[id] = { 
                    modelo: m.equipamento.modelo, 
                    tag: m.equipamento.tag, 
                    unidade: m.equipamento.unidade.nomeSistema,
                    corretivas: 0, 
                    preventivas: 0, 
                    horasParado: 0 
                };
            }

            if (m.tipo === 'Corretiva') {
                stats[id].corretivas += 1;
                if (m.dataInicioReal && m.dataFimReal) {
                    const diff = differenceInHours(new Date(m.dataFimReal), new Date(m.dataInicioReal));
                    stats[id].horasParado += Math.max(0, diff);
                }
            } else if (m.tipo === 'Preventiva') {
                stats[id].preventivas += 1;
            }
        });

        const listaStats = Object.values(stats);

        res.json({
            ano: agora.getFullYear(),
            resumo: {
                totalPreventivas: manutencoes.filter(m => m.tipo === 'Preventiva').length,
                totalCorretivas: manutencoes.filter(m => m.tipo === 'Corretiva').length,
            },
            rankingDowntime: [...listaStats].sort((a, b) => b.horasParado - a.horasParado).slice(0, 10),
            rankingFrequencia: [...listaStats].sort((a, b) => b.corretivas - a.corretivas).slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({ message: "Erro no BI" });
    }
});

export default router;