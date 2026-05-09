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

// Preventivas e corretivas agendadas: paradas durante a janela do agendamento
function calcularHorasParado(manutencao) {
  const inicio = toDateOrNull(manutencao.dataHoraAgendamentoInicio);
  const fim =
    toDateOrNull(manutencao.dataFimReal) ||
    toDateOrNull(manutencao.dataConclusao);

  if (!inicio || !fim || fim <= inicio) {
    return 0;
  }

  return Math.max(0, differenceInMinutes(fim, inicio)) / 60;
}

// OS Corretivas: downtime depende do status do equipamento na abertura
function calcularHorasParadoOsCorretiva(os) {
  const conclusao = toDateOrNull(os.dataHoraConclusao);
  if (!conclusao) return 0;

  if (os.statusEquipamentoAbertura === 'Inoperante') {
    const abertura = toDateOrNull(os.dataHoraAbertura);
    if (!abertura) return 0;
    return Math.max(0, differenceInMinutes(conclusao, abertura)) / 60;
  }

  // UsoLimitado ou Operante: conta apenas durante visitas concluídas
  const visitas = (os.visitas || []).filter(v => v.resultado);
  if (!visitas.length) return 0;

  let totalMinutos = 0;
  for (const visita of visitas) {
    const inicio =
      toDateOrNull(visita.dataHoraInicioReal) ||
      toDateOrNull(visita.dataHoraInicioPrevista);
    const fim =
      toDateOrNull(visita.dataHoraFimReal) || conclusao;
    if (inicio && fim && fim > inicio) {
      totalMinutos += differenceInMinutes(fim, inicio);
    }
  }
  return Math.max(0, totalMinutos) / 60;
}

router.get('/indicadores', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const agora = new Date();
    const inicioAno = startOfYear(agora);
    const fimAno = endOfYear(agora);

    const [manutencoes, osCorretivas, totalEquipamentos, osConcluidasAno, backlogManutencoes, backlogOsCorretivas, preventivasAno] = await Promise.all([
      prisma.manutencao.findMany({
        where: {
          tenantId,
          status: 'Concluida',
          dataConclusao: { gte: inicioAno, lte: fimAno },
        },
        include: {
          equipamento: { include: { unidade: true } },
        },
        orderBy: { dataConclusao: 'desc' },
      }),

      prisma.osCorretiva.findMany({
        where: {
          tenantId,
          status: 'Concluida',
          dataHoraConclusao: { gte: inicioAno, lte: fimAno },
        },
        include: {
          equipamento: { include: { unidade: true } },
          visitas: {
            where: { resultado: { not: null } },
            select: {
              dataHoraInicioPrevista: true,
              dataHoraFimPrevista: true,
              dataHoraInicioReal: true,
              dataHoraFimReal: true,
              resultado: true,
            },
          },
        },
      }),

      prisma.equipamento.count({ where: { tenantId } }),

      // MTTR: OS Corretivas concluídas no ano
      prisma.osCorretiva.findMany({
        where: {
          tenantId,
          status: 'Concluida',
          dataHoraConclusao: { gte: inicioAno, lte: fimAno },
        },
        select: { dataHoraAbertura: true, dataHoraConclusao: true },
      }),

      // Backlog: manutenções em aberto
      prisma.manutencao.count({
        where: { tenantId, status: { notIn: ['Concluida', 'Cancelada'] } },
      }),

      // Backlog: OS corretivas em aberto
      prisma.osCorretiva.count({
        where: { tenantId, status: { not: 'Concluida' } },
      }),

      // Conformidade PM: preventivas concluídas no ano
      prisma.manutencao.findMany({
        where: {
          tenantId,
          tipo: 'Preventiva',
          status: 'Concluida',
          dataConclusao: { gte: inicioAno, lte: fimAno },
        },
        select: { dataConclusao: true, dataHoraAgendamentoFim: true },
      }),
    ]);

    const statsEquip = {};
    const statsUnidade = {};

    function garantirStatsEquip(eId, equip) {
      if (!statsEquip[eId]) {
        statsEquip[eId] = {
          equipamentoId: eId,
          modelo: equip.modelo,
          tag: equip.tag,
          unidadeId: equip.unidadeId,
          unidade: equip.unidade?.nomeSistema || 'N/A',
          corretivas: 0,
          preventivas: 0,
          horasParado: 0,
        };
      }
    }

    function garantirStatsUnidade(uId, uNome) {
      if (!statsUnidade[uId]) {
        statsUnidade[uId] = { unidadeId: uId, nome: uNome, horasParado: 0 };
      }
    }

    for (const m of manutencoes) {
      if (!m.equipamento?.unidade) continue;

      const eId = m.equipamentoId;
      const uId = m.equipamento.unidadeId;
      const uNome = m.equipamento.unidade.nomeSistema;

      garantirStatsEquip(eId, m.equipamento);
      garantirStatsUnidade(uId, uNome);

      if (m.tipo === 'Corretiva') statsEquip[eId].corretivas += 1;
      else if (m.tipo === 'Preventiva') statsEquip[eId].preventivas += 1;

      const horas = calcularHorasParado(m);
      statsEquip[eId].horasParado += horas;
      statsUnidade[uId].horasParado += horas;
    }

    for (const os of osCorretivas) {
      if (!os.equipamento?.unidade) continue;

      const eId = os.equipamentoId;
      const uId = os.equipamento.unidadeId;
      const uNome = os.equipamento.unidade.nomeSistema;

      garantirStatsEquip(eId, os.equipamento);
      garantirStatsUnidade(uId, uNome);

      statsEquip[eId].corretivas += 1;

      const horas = calcularHorasParadoOsCorretiva(os);
      statsEquip[eId].horasParado += horas;
      statsUnidade[uId].horasParado += horas;
    }

    const manutencoesPreventivas = manutencoes.filter(m => m.tipo === 'Preventiva').length;
    const manutencoesCorretivas = manutencoes.filter(m => m.tipo === 'Corretiva').length + osCorretivas.length;

    // MTTR (Mean Time To Repair) — média em horas das OS corretivas concluídas
    let mttrHoras = null;
    if (osConcluidasAno.length > 0) {
      const totalMinutos = osConcluidasAno.reduce((acc, os) => {
        if (!os.dataHoraAbertura || !os.dataHoraConclusao) return acc;
        return acc + differenceInMinutes(new Date(os.dataHoraConclusao), new Date(os.dataHoraAbertura));
      }, 0);
      mttrHoras = Math.round((totalMinutos / osConcluidasAno.length / 60) * 10) / 10;
    }

    // Conformidade PM — % preventivas concluídas dentro do prazo agendado
    let conformidadePM = null;
    if (preventivasAno.length > 0) {
      const noPrazo = preventivasAno.filter((m) => {
        if (!m.dataConclusao || !m.dataHoraAgendamentoFim) return false;
        return new Date(m.dataConclusao) <= new Date(m.dataHoraAgendamentoFim);
      }).length;
      conformidadePM = Math.round((noPrazo / preventivasAno.length) * 100);
    }

    const backlog = backlogManutencoes + backlogOsCorretivas;

    const rankingDowntime = Object.values(statsEquip)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10);

    const rankingFrequencia = Object.values(statsEquip)
      .sort((a, b) => b.corretivas - a.corretivas)
      .slice(0, 10);

    const rankingUnidades = Object.values(statsUnidade)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10);

    // Evolução mensal — meses de Jan até o mês atual
    const mesAtual = agora.getMonth();
    const evolucaoMensal = Array.from({ length: mesAtual + 1 }, (_, mesIdx) => {
      const mesLabel = `${agora.getFullYear()}-${String(mesIdx + 1).padStart(2, '0')}`;

      const preventMes = manutencoes.filter(
        (m) => m.tipo === 'Preventiva' && m.dataConclusao && new Date(m.dataConclusao).getMonth() === mesIdx
      ).length;

      const corrMes =
        manutencoes.filter(
          (m) => m.tipo === 'Corretiva' && m.dataConclusao && new Date(m.dataConclusao).getMonth() === mesIdx
        ).length +
        osCorretivas.filter(
          (os) => os.dataHoraConclusao && new Date(os.dataHoraConclusao).getMonth() === mesIdx
        ).length;

      const downtimeMes =
        manutencoes
          .filter((m) => m.dataConclusao && new Date(m.dataConclusao).getMonth() === mesIdx)
          .reduce((acc, m) => acc + calcularHorasParado(m), 0) +
        osCorretivas
          .filter((os) => os.dataHoraConclusao && new Date(os.dataHoraConclusao).getMonth() === mesIdx)
          .reduce((acc, os) => acc + calcularHorasParadoOsCorretiva(os), 0);

      return {
        mes: mesLabel,
        preventivas: preventMes,
        corretivas: corrMes,
        downtime: Math.round(downtimeMes * 10) / 10,
      };
    });

    // MTBF frota — horas de operação / número total de falhas corretivas
    const horasDecorridas = differenceInMinutes(agora, inicioAno) / 60;
    const totalCorretivasFlota = manutencoesCorretivas;
    const mtbfHoras = totalCorretivasFlota > 0
      ? Math.round((horasDecorridas / totalCorretivasFlota) * 10) / 10
      : null;

    // Disponibilidade % frota — (horas totais - downtime) / horas totais
    const totalHorasFlota = totalEquipamentos * horasDecorridas;
    const totalDowntimeFlota = Object.values(statsEquip).reduce((a, e) => a + e.horasParado, 0);
    const disponibilidadePct = totalHorasFlota > 0
      ? Math.round(((totalHorasFlota - totalDowntimeFlota) / totalHorasFlota) * 1000) / 10
      : null;

    // Reincidentes — equipamentos com ≥ 2 ocorrências corretivas
    const reincidentes = Object.values(statsEquip)
      .filter((e) => e.corretivas >= 2)
      .sort((a, b) => b.corretivas - a.corretivas)
      .slice(0, 10);

    return res.status(200).json({
      ano: agora.getFullYear(),
      resumoGeral: {
        totalAtivos: totalEquipamentos,
        preventivas: manutencoesPreventivas,
        corretivas: manutencoesCorretivas,
        totalManutencoesConcluidas: manutencoes.length + osCorretivas.length,
      },
      kpis: {
        mttrHoras,
        conformidadePM,
        backlog,
        mtbfHoras,
        disponibilidadePct,
      },
      rankingDowntime,
      rankingFrequencia,
      rankingUnidades,
      evolucaoMensal,
      reincidentes,
    });
  } catch (error) {
    console.error('[BI_INDICADORES_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno ao gerar indicadores de BI.',
    });
  }
});

export default router;
