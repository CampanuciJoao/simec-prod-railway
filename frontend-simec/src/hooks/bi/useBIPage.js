import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIndicadoresBI } from '../../services/api';
import { exportarBIPDF } from '../../utils/pdfUtils';
import { formatarDowntime, somarDowntimeHoras } from '../../utils/downtimeUtils';

export function useBIPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const carregarBI = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getIndicadoresBI();
      setDados(response || null);
    } catch (err) {
      console.error('Erro ao carregar BI:', err);
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

  const downtimePorUnidadeChartData = useMemo(() => {
    const ranking = Array.isArray(dados?.rankingUnidades)
      ? dados.rankingUnidades
      : [];

    return ranking.map((item) => ({
      name: item.nome,
      value: Number(item.horasParado || 0),
    }));
  }, [dados]);

  const rankingFrequencia = useMemo(() => {
    const ranking = Array.isArray(dados?.rankingFrequencia)
      ? dados.rankingFrequencia
      : [];

    return ranking.map((item) => ({
      ...item,
      corretivas: Number(item.corretivas || 0),
    }));
  }, [dados]);

  const rankingDowntime = useMemo(() => {
    const ranking = Array.isArray(dados?.rankingDowntime)
      ? dados.rankingDowntime
      : [];

    return ranking.map((item) => ({
      ...item,
      horasParado: Number(item.horasParado || 0),
      downtimeFormatado: formatarDowntime(item.horasParado),
    }));
  }, [dados]);

  const resumoCards = useMemo(() => {
    const totalAtivos = Number(dados?.resumoGeral?.totalAtivos || 0);
    const preventivas = Number(dados?.resumoGeral?.preventivas || 0);
    const corretivas = Number(dados?.resumoGeral?.corretivas || 0);

    const totalDowntimeHoras = somarDowntimeHoras(rankingDowntime, 'horasParado');

    const unidadeCritica =
      Array.isArray(dados?.rankingUnidades) && dados.rankingUnidades.length > 0
        ? dados.rankingUnidades[0]
        : null;

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
  }, [dados, rankingDowntime]);

  const handleDrillDownEquipamento = useCallback(
    (equipamentoId) => {
      if (!equipamentoId) return;

      navigate('/manutencoes', {
        state: {
          filtroEquipamentoId: equipamentoId,
          filtroTipoInicial: 'Corretiva',
        },
      });
    },
    [navigate]
  );

  const handlePrint = useCallback(() => {
    if (!dados) return;
    exportarBIPDF(dados);
  }, [dados]);

  return {
    dados,
    loading,
    error,
    resumoCards,
    downtimePorUnidadeChartData,
    rankingFrequencia,
    rankingDowntime,
    handleDrillDownEquipamento,
    handlePrint,
    recarregar: carregarBI,
  };
}