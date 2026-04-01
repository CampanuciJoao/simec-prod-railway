// Ficheiro: simec/backend-simec/routes/biRoutes.js
// VERSÃO ATUALIZADA - CÁLCULO DE DOWNTIME INCLUINDO PREVENTIVAS

import express from 'express';
import prisma from '../services/prismaService.js';
import { startOfYear, endOfYear, differenceInHours } from 'date-fns';

const router = express.Router();

router.get('/indicadores', async (req, res) => {
    try {
        const agora = new Date();
        const inicioAno = startOfYear(agora);
        const fimAno = endOfYear(agora);

        // 1. Busca todas as manutenções concluídas no ano e a contagem total do parque
        const [manutencoes, totalEquipamentos] = await Promise.all([
            prisma.manutencao.findMany({
                where: { 
                    status: 'Concluida', 
                    dataConclusao: { gte: inicioAno, lte: fimAno } 
                },
                include: { 
                    equipamento: { 
                        include: { unidade: true } 
                    } 
                }
            }),
            prisma.equipamento.count()
        ]);

        const statsEquip = {};
        const statsUnidade = {};

        manutencoes.forEach(m => {
            const eId = m.equipamentoId;
            const uId = m.equipamento.unidadeId;
            const uNome = m.equipamento.unidade.nomeSistema;

            // Inicializa os objetos de estatística caso não existam
            if (!statsEquip[eId]) {
                statsEquip[eId] = { 
                    modelo: m.equipamento.modelo, 
                    tag: m.equipamento.tag, 
                    unidade: uNome, 
                    corretivas: 0, 
                    preventivas: 0, 
                    horasParado: 0 
                };
            }
            if (!statsUnidade[uId]) {
                statsUnidade[uId] = { 
                    nome: uNome, 
                    horasParado: 0 
                };
            }

            // --- A. CONTABILIZA QUANTIDADES POR TIPO ---
            if (m.tipo === 'Corretiva') {
                statsEquip[eId].corretivas += 1;
            } else if (m.tipo === 'Preventiva') {
                statsEquip[eId].preventivas += 1;
            }

            // --- B. CÁLCULO DE HORAS (DOWNTIME) ---
            // Agora calcula para QUALQUER tipo de manutenção, desde que tenha datas reais
            if (m.dataInicioReal && m.dataFimReal) {
                const diff = differenceInHours(new Date(m.dataFimReal), new Date(m.dataInicioReal));
                const horasValidas = Math.max(0, diff); // Evita valores negativos por erro de digitação
                
                // Soma no equipamento
                statsEquip[eId].horasParado += horasValidas;
                // Soma na unidade
                statsUnidade[uId].horasParado += horasValidas;
            }
        });

        // Converte os objetos em listas e ordena para os rankings
        const rankingDowntime = Object.values(statsEquip)
            .sort((a, b) => b.horasParado - a.horasParado)
            .slice(0, 10);

        const rankingFrequencia = Object.values(statsEquip)
            .sort((a, b) => b.corretivas - a.corretivas)
            .slice(0, 10);

        const rankingUnidades = Object.values(statsUnidade)
            .sort((a, b) => b.horasParado - a.horasParado)
            .slice(0, 10);

        res.json({
            ano: agora.getFullYear(),
            resumoGeral: { 
                totalAtivos: totalEquipamentos, 
                preventivas: manutencoes.filter(m => m.tipo === 'Preventiva').length, 
                corretivas: manutencoes.filter(m => m.tipo === 'Corretiva').length 
            },
            rankingDowntime,
            rankingFrequencia,
            rankingUnidades
        });

    } catch (error) {
        console.error("Erro ao processar indicadores BI:", error);
        res.status(500).json({ message: "Erro interno ao gerar indicadores de BI." });
    }
});

export default router;