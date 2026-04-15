import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getIndicadoresBI } from '@/services/api';
import { exportarBIPDF } from '@/utils/pdfUtils';
import { formatarDowntime, somarDowntimeHoras } from '@/utils/bi';
import { buildDrawerContent } from '@/utils/bi/biDrawerBuilder';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  return Number(value || 0);
}

function mapRankingUnidadesToChartData(rankingUnidades = []) {
  return rankingUnidades.map((item) => ({
    name: item.nome,
    value: toNumber(item.horasParado),
  }));
}

function mapRankingFrequencia(ranking = []) {
  return ranking.map((item) => ({
    ...item,
    corretivas: toNumber(item.corretivas),
  }));
}

function mapRankingDowntime(ranking = []) {
  return ranking.map((item) => {
    const horasParado = toNumber(item.horasParado);

    return {
      ...item,
      horasParado,
      downtimeFormatado: formatarDowntime(horasParado),
    };
  });
}

function buildResumoCards(dados, rankingDowntime, rankingUnidades) {
  const totalAtivos = toNumber(dados?.resumoGeral?.totalAtivos);
  const preventivas = toNumber(dados?.resumoGeral?.preventivas);
  const corretivas = toNumber(dados?.resumoGeral?.corretivas);

  const totalDowntimeHoras = somarDowntimeHoras(rankingDowntime, 'horasParado');

  const unidadeCritica = rankingUnidades.length > 0 ? rankingUnidades[0] : null;

  return {
    totalAtivos,
    preventivas,
    corretivas,
    downtimeAcumulado: formatarDowntime(totalDowntimeHoras),
    unidadeCritica: unidadeCritica
      ? {
          nome: unidadeCritica.nome,
          downtime: formatarDowntime(unidadeCritica.horasParado),
        }
      : null,
  };
}

export function useBIPage() {
  const navigate = useNavigate();

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState({
    open: false,
    type: null,
  });

  const carregarBI = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getIndicadoresBI();
      setDados(response || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao carregar dados de BI.'
      );
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarBI();
  }, [carregarBI]);

  const rankingUnidades = useMemo(() => {
    return toArray(dados?.rankingUnidades);
  }, [dados]);

  const downtimePorUnidadeChartData = useMemo(() => {
    return mapRankingUnidadesToChartData(rankingUnidades);
  }, [rankingUnidades]);

  const rankingFrequencia = useMemo(() => {
    return mapRankingFrequencia(toArray(dados?.rankingFrequencia));
  }, [dados]);

  const rankingDowntime = useMemo(() => {
    return mapRankingDowntime(toArray(dados?.rankingDowntime));
  }, [dados]);

  const resumoCards = useMemo(() => {
    return buildResumoCards(dados, rankingDowntime, rankingUnidades);
  }, [dados, rankingDowntime, rankingUnidades]);

  const openDrawer = useCallback((type) => {
    setDrawer({ open: true, type });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, type: null });
  }, []);

  const goToRoute = useCallback(
    (pathname, state = undefined) => {
      navigate(pathname, state ? { state } : undefined);
    },
    [navigate]
  );

  const handleDrillDownEquipamento = useCallback(
    (equipamentoId) => {
      if (!equipamentoId) return;

      goToRoute('/manutencoes', {
        filtroEquipamentoId: equipamentoId,
        filtroTipoInicial: 'Corretiva',
      });
    },
    [goToRoute]
  );

  const handleGoToAtivos = useCallback(() => {
    goToRoute('/equipamentos');
  }, [goToRoute]);

  const handleGoToPreventivas = useCallback(() => {
    goToRoute('/manutencoes', {
      filtroTipoInicial: 'Preventiva',
    });
  }, [goToRoute]);

  const handleGoToCorretivas = useCallback(() => {
    goToRoute('/manutencoes', {
      filtroTipoInicial: 'Corretiva',
    });
  }, [goToRoute]);

  const handleGoToDowntime = useCallback(() => {
    goToRoute('/manutencoes');
  }, [goToRoute]);

  const handleGoToUnidadeCritica = useCallback(() => {
    const unidadeNome = rankingUnidades[0]?.nome;
    if (!unidadeNome) return;

    goToRoute('/equipamentos', {
      filtroUnidadeNomeInicial: unidadeNome,
    });
  }, [goToRoute, rankingUnidades]);

  const handlePrint = useCallback(() => {
    if (!dados) return;
    exportarBIPDF(dados);
  }, [dados]);

  const drawerContent = useMemo(() => {
    return buildDrawerContent({
      type: drawer.type,
      resumoCards,
      rankingFrequencia,
      rankingDowntime,
      rankingUnidades,
      handlers: {
        goToAtivos: handleGoToAtivos,
        goToPreventivas: handleGoToPreventivas,
        goToCorretivas: handleGoToCorretivas,
        goToDowntime: handleGoToDowntime,
        goToUnidadeCritica: handleGoToUnidadeCritica,
        drillDown: handleDrillDownEquipamento,
      },
    });
  }, [
    drawer.type,
    resumoCards,
    rankingFrequencia,
    rankingDowntime,
    rankingUnidades,
    handleGoToAtivos,
    handleGoToPreventivas,
    handleGoToCorretivas,
    handleGoToDowntime,
    handleGoToUnidadeCritica,
    handleDrillDownEquipamento,
  ]);

  return {
    dados,
    loading,
    error,

    drawer,
    drawerContent,
    openDrawer,
    closeDrawer,

    resumoCards,
    downtimePorUnidadeChartData,
    rankingFrequencia,
    rankingDowntime,
    rankingUnidades,

    handleDrillDownEquipamento,
    handleGoToAtivos,
    handleGoToPreventivas,
    handleGoToCorretivas,
    handleGoToDowntime,
    handleGoToUnidadeCritica,
    handlePrint,

    recarregar: carregarBI,
  };
}