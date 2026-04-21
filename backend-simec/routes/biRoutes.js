// Ficheiro: routes/biRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import prisma from '../services/prismaService.js';
import { startOfYear, endOfYear, differenceInMinutes } from 'date-fns';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(proteger);

function toDateOrNull(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calcularHorasParado(manutencao) {
  const inicio =
    toDateOrNull(manutencao.dataInicioReal) ||
    toDateOrNull(manutencao.dataHoraAgendamentoInicio);

  const fim =
    toDateOrNull(manutencao.dataFimReal) ||
    toDateOrNull(manutencao.dataConclusao) ||
    toDateOrNull(manutencao.dataHoraAgendamentoFim);

  if (!inicio || !fim || fim < inicio) {
    return 0;
  }

  const minutos = differenceInMinutes(fim, inicio);
  return Math.max(0, minutos) / 60;
}

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
        orderBy: {
          dataConclusao: 'desc',
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

    for (const m of manutencoes) {
      if (!m.equipamento || !m.equipamento.unidade) {
        continue;
      }

      const eId = m.equipamentoId;
      const uId = m.equipamento.unidadeId;
      const uNome = m.equipamento.unidade.nomeSistema;

      if (!statsEquip[eId]) {
        statsEquip[eId] = {
          equipamentoId: eId,
          modelo: m.equipamento.modelo,
          tag: m.equipamento.tag,
          unidadeId: uId,
          unidade: uNome,
          corretivas: 0,
          preventivas: 0,
          horasParado: 0,
        };
      }

      if (!statsUnidade[uId]) {
        statsUnidade[uId] = {
          unidadeId: uId,
          nome: uNome,
          horasParado: 0,
        };
      }

      if (m.tipo === 'Corretiva') {
        statsEquip[eId].corretivas += 1;
      } else if (m.tipo === 'Preventiva') {
        statsEquip[eId].preventivas += 1;
      }

      {
        const horasValidas = calcularHorasParado(m);
        statsEquip[eId].horasParado += horasValidas;
        statsUnidade[uId].horasParado += horasValidas;
      }
    }

    const manutencoesPreventivas = manutencoes.filter(
      (m) => m.tipo === 'Preventiva'
    ).length;

    const manutencoesCorretivas = manutencoes.filter(
      (m) => m.tipo === 'Corretiva'
    ).length;

    const rankingDowntime = Object.values(statsEquip)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10);

    const rankingFrequencia = Object.values(statsEquip)
      .sort((a, b) => b.corretivas - a.corretivas)
      .slice(0, 10);

    const rankingUnidades = Object.values(statsUnidade)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10);

    return res.status(200).json({
      ano: agora.getFullYear(),
      resumoGeral: {
        totalAtivos: totalEquipamentos,
        preventivas: manutencoesPreventivas,
        corretivas: manutencoesCorretivas,
        totalManutencoesConcluidas: manutencoes.length,
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
