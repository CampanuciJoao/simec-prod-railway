// Ficheiro: routes/dashboardRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import prisma from '../services/prismaService.js';
import { getMonth, getYear } from 'date-fns';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(proteger);

const getUltimosSeisMesesLabels = () => {
  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const labels = [];
  const hoje = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    labels.push(`${mesesNomes[getMonth(d)]}/${getYear(d).toString().slice(-2)}`);
  }

  return labels;
};

router.get('/', async (req, res) => {
  try {
    const userId = req.usuario.id;
    const tenantId = req.usuario.tenantId;

    const hoje = new Date();
    const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

    const [
      totalEquipamentos,
      manutencoesPendentes,
      contratosVencendo,
      alertasNaoVistosCount,
      statusEquipamentosGroups,
      manutencoesDosUltimos6Meses,
      alertasRecentes
    ] = await Promise.all([

      prisma.equipamento.count({
        where: { tenantId }
      }),

      prisma.manutencao.count({
        where: {
          tenantId,
          status: { in: ['Agendada', 'EmAndamento', 'AguardandoConfirmacao'] }
        }
      }),

      prisma.contrato.count({
        where: {
          tenantId,
          status: 'Ativo',
          dataFim: {
            gte: hoje,
            lte: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      prisma.alerta.count({
        where: {
          tenantId,
          NOT: {
            lidoPorUsuarios: {
              some: {
                tenantId,
                usuarioId: userId,
                visto: true
              }
            }
          }
        }
      }),

      prisma.equipamento.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true }
      }),

      prisma.manutencao.findMany({
        where: {
          tenantId,
          createdAt: { gte: seisMesesAtras }
        },
        select: {
          createdAt: true,
          tipo: true
        }
      }),

      prisma.alerta.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          titulo: true,
          prioridade: true,
          link: true
        }
      })
    ]);

    const statusCores = {
      Operante: { light: '#22C55E', dark: '#4ADE80', textLight: '#15803D', textDark: '#D1FAE5' },
      EmManutencao: { light: '#F59E0B', dark: '#FBBF24', textLight: '#B45309', textDark: '#FEF3C7' },
      Inoperante: { light: '#EF4444', dark: '#F87171', textLight: '#B91C1C', textDark: '#FEE2E2' },
      UsoLimitado: { light: '#6366F1', dark: '#818CF8', textLight: '#4338CA', textDark: '#E0E7FF' },
    };

    const statusEquipamentosFormatado = {
      labels: statusEquipamentosGroups.map(g => g.status),
      data: statusEquipamentosGroups.map(g => g._count.id),
      colorsLight: statusEquipamentosGroups.map(g => statusCores[g.status]?.light || '#A8A29E'),
      colorsDark: statusEquipamentosGroups.map(g => statusCores[g.status]?.dark || '#A8A29E'),
      textColorsLight: statusEquipamentosGroups.map(g => statusCores[g.status]?.textLight || '#A8A29E'),
      textColorsDark: statusEquipamentosGroups.map(g => statusCores[g.status]?.textDark || '#A8A29E'),
    };

    const labelsMeses = getUltimosSeisMesesLabels();
    const tiposDeManutencao = ["Preventiva", "Corretiva", "Calibracao", "Inspecao"];

    const manutencoesAgrupadas = labelsMeses.reduce((acc, label) => {
      acc[label] = {};
      tiposDeManutencao.forEach(tipo => acc[label][tipo] = 0);
      return acc;
    }, {});

    const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    manutencoesDosUltimos6Meses.forEach(m => {
      if (!m.createdAt || !m.tipo) return;

      const chaveMes = `${mesesNomes[getMonth(m.createdAt)]}/${getYear(m.createdAt).toString().slice(-2)}`;

      if (chaveMes in manutencoesAgrupadas) {
        manutencoesAgrupadas[chaveMes][m.tipo]++;
      }
    });

    const datasetsPorTipo = tiposDeManutencao.map(tipo => ({
      label: tipo,
      data: labelsMeses.map(mes => manutencoesAgrupadas[mes][tipo] || 0)
    }));

    const manutencoesPorMesFormatado = {
      labels: labelsMeses,
      datasets: datasetsPorTipo
    };

    const responsePayload = {
      equipamentosCount: totalEquipamentos,
      manutencoesCount: manutencoesPendentes,
      contratosVencendoCount: contratosVencendo,
      alertasAtivos: alertasNaoVistosCount,
      alertasRecentes,
      statusEquipamentos: statusEquipamentosFormatado,
      manutencoesPorTipoMes: manutencoesPorMesFormatado,
    };

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('[DASHBOARD_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao processar dashboard.'
    });
  }
});

export default router;