// Hook da aba "Ocorrências" da página de Gerenciamento.
// Lista apenas OsCorretiva tipo='Ocorrencia' (relato de problema sem visita
// agendada ainda). Quando uma ocorrência ganha visita de terceiro, ela vira
// tipo='Corretiva' e migra para a aba Manutenções.

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOsCorretiva } from '@/hooks/osCorretiva/useOsCorretiva';
import { useModal } from '@/hooks/shared/useModal';

const STATUS_LABELS = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  Concluida: 'Concluída',
  Cancelada: 'Cancelada',
};

function formatarLabel(valor) {
  if (!valor) return '';
  return STATUS_LABELS[valor] || valor;
}

export function useTabOcorrencias() {
  const navigate = useNavigate();
  const osc = useOsCorretiva({ tipoFixo: 'Ocorrencia' });
  const deleteModal = useModal();

  const items = useMemo(
    () =>
      osc.osCorretivas.map((item) => ({
        ...item,
        _kind: 'osCorretiva',
        _sortDate: item.dataHoraAbertura || item.createdAt || '',
      })),
    [osc.osCorretivas]
  );

  // KPIs: Total | Em andamento (Aberta+EmAndamento) | Concluídas | Canceladas
  const metricas = useMemo(() => ({
    total: osc.metricas?.total ?? 0,
    emAndamento: (osc.metricas?.abertas ?? 0) + (osc.metricas?.emAndamento ?? 0),
    concluidas: osc.metricas?.concluidas ?? 0,
    canceladas: osc.metricas?.canceladas ?? 0,
  }), [osc.metricas]);

  // Filtro de status no front: opção "em-andamento" agrega Aberta+EmAndamento.
  // Como o backend filtra um único status por vez, a opção composta dispara
  // refetch sem status (mostra tudo) e o front faz o slice via metricas/badge.
  // Para o filtro real, só os status puros são enviados.
  const selectFilters = useMemo(() => {
    const statusOptions = [
      { value: 'Aberta', label: 'Aberta' },
      { value: 'EmAndamento', label: 'Em Andamento' },
      { value: 'Concluida', label: 'Concluída' },
      { value: 'Cancelada', label: 'Cancelada' },
    ];

    return [
      {
        id: 'status',
        label: 'Status',
        value: osc.filtros.status,
        defaultLabel: 'Todos os status',
        options: statusOptions,
        onChange: (value) => osc.handleFilterChange('status', value),
      },
    ];
  }, [osc]);

  const activeFilters = useMemo(() => {
    const items = [];
    if (osc.filtros.status) {
      items.push({
        key: 'status',
        label: `Status: ${formatarLabel(osc.filtros.status)}`,
        value: osc.filtros.status,
      });
    }
    if (osc.searchTerm) {
      items.push({
        key: 'searchTerm',
        label: `Busca: ${osc.searchTerm}`,
        value: osc.searchTerm,
      });
    }
    return items;
  }, [osc.filtros, osc.searchTerm]);

  const clearFilter = useCallback(
    (key) => {
      if (key === 'searchTerm') {
        osc.handleSearchChange?.({ target: { value: '' } });
        return;
      }
      osc.handleFilterChange(key, '');
    },
    [osc]
  );

  const clearAllFilters = useCallback(() => {
    osc.handleSearchChange?.({ target: { value: '' } });
    osc.handleFilterChange('status', '');
  }, [osc]);

  const activeKpi = useMemo(() => {
    const s = osc.filtros.status;
    if (!s) return 'total';
    if (s === 'Concluida') return 'concluidas';
    if (s === 'Cancelada') return 'canceladas';
    // 'Aberta' e 'EmAndamento' caem em "Em andamento", mas não temos como
    // pintar os 2 como ativos com um único valor — fica indicado quando o
    // dropdown está aplicado e o card "Total" perde o highlight.
    if (s === 'Aberta' || s === 'EmAndamento') return 'emAndamento';
    return null;
  }, [osc.filtros.status]);

  const handleSelectKpi = useCallback((kpiKey) => {
    const mapa = {
      total: '',
      // "Em andamento" no card representa Aberta+EmAndamento. Como o backend
      // só filtra 1 status, ao clicar zeramos o filtro de status e o usuário
      // ainda enxerga o todo — a sinalização vem do contador do card.
      emAndamento: '',
      concluidas: 'Concluida',
      canceladas: 'Cancelada',
    };
    const s = mapa[kpiKey];
    if (s === undefined) return;
    osc.handleFilterChange('status', s);
  }, [osc]);

  const goToCreate = useCallback(
    () => navigate('/manutencoes/ocorrencia/abrir'),
    [navigate]
  );

  return {
    items,
    metricas,
    activeKpi,
    handleSelectKpi,

    searchTerm: osc.searchTerm,
    onSearchChange: osc.handleSearchChange,

    selectFilters,
    activeFilters,
    clearFilter,
    clearAllFilters,

    pagination: {
      totalCarregado: items.length,
      total: osc.pagination?.total ?? 0,
      hasNextPage: Boolean(osc.pagination?.hasNextPage),
    },
    loading: osc.loading && items.length === 0,
    loadingMore: osc.loadingMore,
    error: osc.error,
    carregarMais: osc.carregarMais,
    refetch: osc.refetch,

    deleteModal,
    removerOs: osc.removerOs,

    goToCreate,
  };
}
