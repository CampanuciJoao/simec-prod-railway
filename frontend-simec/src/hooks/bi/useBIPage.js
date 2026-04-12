import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIndicadoresBI } from '../../services/api';
import { exportarBIPDF } from '../../utils/pdfUtils';
import { formatarDowntime, somarDowntimeHoras } from '../../utils/downtimeUtils';

export function useBIPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState({
    open: false,
    type: null,
  });

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

  const openDrawer = useCallback((type) => {
    setDrawer({ open: true, type });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, type: null });
  }, []);

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

  const handleGoToAtivos = useCallback(() => {
    navigate('/equipamentos');
  }, [navigate]);

  const handleGoToPreventivas = useCallback(() => {
    navigate('/manutencoes', {
      state: {
        filtroTipoInicial: 'Preventiva',
      },
    });
  }, [navigate]);

  const handleGoToCorretivas = useCallback(() => {
    navigate('/manutencoes', {
      state: {
        filtroTipoInicial: 'Corretiva',
      },
    });
  }, [navigate]);

  const handleGoToUnidadeCritica = useCallback(() => {
    const unidadeNome = dados?.rankingUnidades?.[0]?.nome;
    if (!unidadeNome) return;

    navigate('/equipamentos', {
      state: {
        filtroUnidadeNomeInicial: unidadeNome,
      },
    });
  }, [dados, navigate]);

  const handleGoToDowntime = useCallback(() => {
    navigate('/manutencoes');
  }, [navigate]);

  const handlePrint = useCallback(() => {
    if (!dados) return;
    exportarBIPDF(dados);
  }, [dados]);

  const drawerContent = useMemo(() => {
    if (drawer.type === 'ativos') {
      return {
        title: 'Ativos no sistema',
        subtitle: 'Resumo do parque cadastrado',
        actionLabel: 'Abrir equipamentos',
        onAction: handleGoToAtivos,
        items: [],
        stats: [
          { label: 'Total de ativos', value: resumoCards.totalAtivos },
        ],
      };
    }

    if (drawer.type === 'preventivas') {
      return {
        title: 'Preventivas realizadas',
        subtitle: 'Indicador consolidado do período',
        actionLabel: 'Abrir manutenções preventivas',
        onAction: handleGoToPreventivas,
        items: [],
        stats: [
          { label: 'Total de preventivas', value: resumoCards.preventivas },
        ],
      };
    }

    if (drawer.type === 'corretivas') {
      return {
        title: 'Falhas corretivas',
        subtitle: 'Equipamentos com reincidência no período',
        actionLabel: 'Abrir corretivas filtradas',
        onAction: handleGoToCorretivas,
        items: rankingFrequencia.slice(0, 10).map((item) => ({
          title: item.modelo,
          subtitle: `Tag: ${item.tag || '—'}`,
          value: `${item.corretivas}`,
          onClick: () => handleDrillDownEquipamento(item.id),
        })),
        stats: [
          { label: 'Total de corretivas', value: resumoCards.corretivas },
        ],
      };
    }

    if (drawer.type === 'downtime') {
      return {
        title: 'Downtime acumulado',
        subtitle: 'Tempo total de indisponibilidade do período',
        actionLabel: 'Abrir visão de manutenção',
        onAction: handleGoToDowntime,
        items: rankingDowntime.slice(0, 10).map((item) => ({
          title: item.modelo,
          subtitle: `${item.unidade} • Tag: ${item.tag || '—'}`,
          value: item.downtimeFormatado,
        })),
        stats: [
          { label: 'Downtime acumulado', value: resumoCards.downtimeAcumulado },
        ],
      };
    }

    if (drawer.type === 'unidadeCritica') {
      return {
        title: 'Unidade mais crítica',
        subtitle: 'Unidade com maior downtime acumulado',
        actionLabel: 'Abrir equipamentos da unidade',
        onAction: handleGoToUnidadeCritica,
        items: (dados?.rankingUnidades || []).slice(0, 10).map((item) => ({
          title: item.nome,
          subtitle: 'Tempo acumulado parado',
          value: formatarDowntime(item.horasParado),
        })),
        stats: [
          {
            label: 'Unidade crítica',
            value: resumoCards.unidadeCritica?.nome || '—',
          },
          {
            label: 'Downtime',
            value: resumoCards.unidadeCritica?.downtime || '—',
          },
        ],
      };
    }

    return {
      title: '',
      subtitle: '',
      actionLabel: '',
      onAction: null,
      items: [],
      stats: [],
    };
  }, [
    dados,
    drawer.type,
    handleDrillDownEquipamento,
    handleGoToAtivos,
    handleGoToCorretivas,
    handleGoToDowntime,
    handleGoToPreventivas,
    handleGoToUnidadeCritica,
    rankingDowntime,
    rankingFrequencia,
    resumoCards,
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