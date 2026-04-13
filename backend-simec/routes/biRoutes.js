// Ficheiro: routes/biRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import prisma from '../services/prismaService.js';
import { startOfYear, endOfYear, differenceInHours } from 'date-fns';

const router = express.Router();

router.get('/indicadores', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const agora = new Date();
    const inicioAno = startOfYear(agora);
    const fimAno = endOfYear(agora);

    const [manutencoes, totalEquipamentos] = await Promise.all([
      prisma.manutencao.findMany({
        where: {
          tenantId,
          status: 'Concluida',
          dataConclusao: {
            gte: inicioAno,
            lte: fimAno,
          },
        },
        include: {
          equipamento: {
            include: {
              unidade: true,
            },
          },
        },
      }),

      prisma.equipamento.count({
        where: {
          tenantId,
        },
      }),
    ]);

    const statsEquip = {};
    const statsUnidade = {};

    manutencoes.forEach((m) => {
      const eId = m.equipamentoId;
      const uId = m.equipamento.unidadeId;
      const uNome = m.equipamento.unidade.nomeSistema;

      if (!statsEquip[eId]) {
        statsEquip[eId] = {
          modelo: m.equipamento.modelo,
          tag: m.equipamento.tag,
          unidade: uNome,
          corretivas: 0,
          preventivas: 0,
          horasParado: 0,
        };
      }

      if (!statsUnidade[uId]) {
        statsUnidade[uId] = {
          nome: uNome,
          horasParado: 0,
        };
      }

      if (m.tipo === 'Corretiva') {
        statsEquip[eId].corretivas += 1;
      } else if (m.tipo === 'Preventiva') {
        statsEquip[eId].preventivas += 1;
      }

      if (m.dataInicioReal && m.dataFimReal) {
        const diff = differenceInHours(
          new Date(m.dataFimReal),
          new Date(m.dataInicioReal)
        );

        const horasValidas = Math.max(0, diff);

        statsEquip[eId].horasParado += horasValidas;
        statsUnidade[uId].horasParado += horasValidas;
      }
    });

    const rankingDowntime = Object.values(statsEquip)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10);

    const rankingFrequencia = Object.values(statsEquip)
      .sort((a, b) => b.corretivas - a.corretivas)
      .slice(0, 10);

    const rankingUnidades = Object.values(statsUnidade)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10);

    return res.json({
      ano: agora.getFullYear(),
      resumoGeral: {
        totalAtivos: totalEquipamentos,
        preventivas: manutencoes.filter((m) => m.tipo === 'Preventiva').length,
        corretivas: manutencoes.filter((m) => m.tipo === 'Corretiva').length,
      },
      rankingDowntime,
      rankingFrequencia,
      rankingUnidades,
    });
  } catch (error) {
    console.error('[BI_INDICADORES_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno ao gerar indicadores de BI.',
    });
  }
});

export default router;