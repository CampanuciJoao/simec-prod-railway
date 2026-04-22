import { useCallback, useEffect, useMemo, useState } from 'react';

import { getIndicadoresBI } from '@/services/api';
import { exportarBIPDFLazy } from '@/services/pdf/pdfExportService';
import {
  mapRankingUnidades,
  mapDowntimePorUnidadeChartData,
  mapRankingFrequencia,
  mapRankingDowntime,
  buildResumoCards,
} from '@/utils/bi';
import { buildDrawerContent } from '@/utils/bi';
import { useBINavigation } from '@/hooks/bi/useBINavigation';

export function useBIPage() {
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
    return mapRankingUnidades(dados?.rankingUnidades);
  }, [dados]);

  const downtimePorUnidadeChartData = useMemo(() => {
    return mapDowntimePorUnidadeChartData(rankingUnidades);
  }, [rankingUnidades]);

  const rankingFrequencia = useMemo(() => {
    return mapRankingFrequencia(dados?.rankingFrequencia);
  }, [dados]);

  const rankingDowntime = useMemo(() => {
    return mapRankingDowntime(dados?.rankingDowntime);
  }, [dados]);

  const resumoCards = useMemo(() => {
    return buildResumoCards(dados, rankingDowntime, rankingUnidades);
  }, [dados, rankingDowntime, rankingUnidades]);

  const {
    handleDrillDownEquipamento,
    handleGoToAtivos,
    handleGoToPreventivas,
    handleGoToCorretivas,
    handleGoToDowntime,
    handleGoToUnidadeCritica,
  } = useBINavigation(rankingUnidades);

  const openDrawer = useCallback((type) => {
    setDrawer({ open: true, type });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, type: null });
  }, []);

  const handlePrint = useCallback(async () => {
    if (!dados) return;
    await exportarBIPDFLazy(dados);
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
