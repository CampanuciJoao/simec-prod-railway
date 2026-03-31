import express from 'express';
import prisma from '../services/prismaService.js';
import { startOfYear, endOfYear, differenceInHours } from 'date-fns';

const router = express.Router();

router.get('/indicadores', async (req, res) => {
    try {
        const agora = new Date();
        const inicioAno = startOfYear(agora);
        const fimAno = endOfYear(agora);

        const [manutencoes, totalEquipamentos] = await Promise.all([
            prisma.manutencao.findMany({
                where: { status: 'Concluida', dataConclusao: { gte: inicioAno, lte: fimAno } },
                include: { equipamento: { include: { unidade: true } } }
            }),
            prisma.equipamento.count()
        ]);

        const statsEquip = {};
        const statsUnidade = {};

        manutencoes.forEach(m => {
            const eId = m.equipamentoId;
            const uId = m.equipamento.unidadeId;
            if (!statsEquip[eId]) {
                statsEquip[eId] = { modelo: m.equipamento.modelo, tag: m.equipamento.tag, unidade: m.equipamento.unidade.nomeSistema, corretivas: 0, preventivas: 0, horasParado: 0 };
            }
            if (!statsUnidade[uId]) {
                statsUnidade[uId] = { nome: m.equipamento.unidade.nomeSistema, horasParado: 0 };
            }
            if (m.tipo === 'Corretiva') {
                statsEquip[eId].corretivas += 1;
                if (m.dataInicioReal && m.dataFimReal) {
                    const diff = differenceInHours(new Date(m.dataFimReal), new Date(m.dataInicioReal));
                    const horas = Math.max(0, diff);
                    statsEquip[eId].horasParado += horas;
                    statsUnidade[uId].horasParado += horas;
                }
            } else if (m.tipo === 'Preventiva') {
                statsEquip[eId].preventivas += 1;
            }
        });

        res.json({
            ano: agora.getFullYear(),
            resumoGeral: { totalAtivos: totalEquipamentos, preventivas: manutencoes.filter(m => m.tipo === 'Preventiva').length, corretivas: manutencoes.filter(m => m.tipo === 'Corretiva').length },
            rankingDowntime: Object.values(statsEquip).sort((a, b) => b.horasParado - a.horasParado).slice(0, 5) || [],
            rankingFrequencia: Object.values(statsEquip).sort((a, b) => b.corretivas - a.corretivas).slice(0, 5) || [],
            rankingUnidades: Object.values(statsUnidade).sort((a, b) => b.horasParado - a.horasParado).slice(0, 5) || []
        });
    } catch (error) {
        res.status(500).json({ message: "Erro BI" });
    }
});

export default router;