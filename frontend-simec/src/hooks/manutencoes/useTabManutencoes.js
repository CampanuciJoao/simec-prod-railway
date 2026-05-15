// Hook orquestrador da aba "Manutenções" da página de Gerenciamento.
// Combina duas fontes:
//   - useManutencoes (Preventiva/Corretiva-agendada/Calibracao/Inspecao)
//   - useOsCorretiva fixado em tipo='Corretiva' (ocorrências que já viraram
//     corretiva via agendamento de visita de terceiro)
//
// Devolve uma view unificada com items mesclados (ordenados por data),
// KPIs combinados, filtros (status, tipo, unidade) e ações.

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useManutencoes } from '@/hooks/manutencoes/useManutencoes';
import { useOsCorretiva } from '@/hooks/osCorretiva/useOsCorretiva';
import { useModal } from '@/hooks/shared/useModal';

const STATUS_LABELS = {
  aguardando: 'Aguardando ação',
  Pendente: 'Em Triagem',
  Agendada: 'Agendada',
  EmAndamento: 'Em Andamento',
  AguardandoConfirmacao: 'Aguardando Confirmação',
  Concluida: 'Concluída',
  Cancelada: 'Cancelada',
};

function formatarLabel(valor) {
  if (!valor) return '';
  if (STATUS_LABELS[valor]) return STATUS_LABELS[valor];
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
}

export function useTabManutencoes() {
  const navigate = useNavigate();
  const manut = useManutencoes();
  const osc = useOsCorretiva({ tipoFixo: 'Corretiva' });
  const deleteModal = useModal();

  // ─── Items unificados ────────────────────────────────────────────────────
  const unifiedItems = useMemo(() => {
    const m = manut.manutencoes.map((item) => ({
      ...item,
      _kind: 'manutencao',
      _sortDate: item.dataHoraAgendamentoInicio || item.createdAt || '',
    }));
    const o = osc.osCorretivas.map((item) => ({
      ...item,
      _kind: 'osCorretiva',
      _sortDate: item.dataHoraAbertura || item.createdAt || '',
    }));
    return [...m, ...o].sort((a, b) => {
      if (!a._sortDate) return 1;
      if (!b._sortDate) return -1;
      return new Date(b._sortDate) - new Date(a._sortDate);
    });
  }, [manut.manutencoes, osc.osCorretivas]);

  // ─── KPIs combinados ─────────────────────────────────────────────────────
  const metricas = useMemo(() => ({
    total: (manut.metricas?.total ?? 0) + (osc.metricas?.total ?? 0),
    agendadas:
      (manut.metricas?.aguardando ?? 0) // status: Pendente+Agendada+EmAndamento+AguardandoConfirmacao
      + (osc.metricas?.aguardandoTerceiro ?? 0), // visita marcada
    // "Em andamento" exclusivo para Manutencao — OsCorretiva-Corretiva fica
    // representada em "Agendadas" por estar em AguardandoTerceiro.
    emAndamento: manut.metricas?.emAndamento ?? 0,
    concluidas: (manut.metricas?.concluidas ?? 0) + (osc.metricas?.concluidas ?? 0),
    canceladas: (manut.metricas?.canceladas ?? 0) + (osc.metricas?.canceladas ?? 0),
  }), [manut.metricas, osc.metricas]);

  // ─── Filtros (config para GlobalFilterBar) ──────────────────────────────
  const selectFilters = useMemo(() => {
    const statusOptions = [
      { value: 'aguardando', label: 'Aguardando ação' },
      { value: 'Pendente', label: 'Em Triagem' },
      { value: 'Agendada', label: 'Agendada' },
      { value: 'EmAndamento', label: 'Em Andamento' },
      { value: 'AguardandoConfirmacao', label: 'Aguardando Confirmação' },
      { value: 'Concluida', label: 'Concluída' },
      { value: 'Cancelada', label: 'Cancelada' },
    ];

    const tipoOptions = ['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'].map(
      (item) => ({ value: item, label: formatarLabel(item) })
    );

    const unidadeOptions = (manut.unidadesDisponiveis || []).map((u) => ({
      value: u.id,
      label: u.nomeSistema,
    }));

    const STATUS_COM_EQUIVALENCIA = new Set(['aguardando', 'Concluida', 'Cancelada']);

    return [
      {
        id: 'status',
        label: 'Status',
        value: manut.filtros.status,
        defaultLabel: 'Todos os status',
        options: statusOptions,
        onChange: (value) => {
          manut.controles.handleFilterChange('status', value);
          osc.handleFilterChange(
            'status',
            STATUS_COM_EQUIVALENCIA.has(value) ? value : ''
          );
        },
      },
      {
        id: 'tipo',
        label: 'Tipo',
        value: manut.filtros.tipo,
        defaultLabel: 'Todos os tipos',
        options: tipoOptions,
        onChange: (value) =>
          manut.controles.handleFilterChange('tipo', value),
      },
      {
        id: 'unidade',
        label: 'Unidade',
        value: manut.filtros.unidadeId,
        defaultLabel: 'Todas as unidades',
        options: unidadeOptions,
        onChange: (value) =>
          manut.controles.handleFilterChange('unidadeId', value),
      },
    ];
  }, [manut.filtros, manut.controles, manut.unidadesDisponiveis, osc]);

  const activeFilters = useMemo(() => {
    const { status, tipo, unidadeId } = manut.filtros;
    const unidade = (manut.unidadesDisponiveis || []).find(
      (item) => item.id === unidadeId
    );
    return [
      status && { key: 'status', label: `Status: ${formatarLabel(status)}`, value: status },
      tipo && { key: 'tipo', label: `Tipo: ${formatarLabel(tipo)}`, value: tipo },
      unidadeId && {
        key: 'unidade',
        label: `Unidade: ${unidade?.nomeSistema || unidadeId}`,
        value: unidadeId,
      },
      manut.searchTerm && {
        key: 'searchTerm',
        label: `Busca: ${manut.searchTerm}`,
        value: manut.searchTerm,
      },
    ].filter(Boolean);
  }, [manut.filtros, manut.searchTerm, manut.unidadesDisponiveis]);

  const clearFilter = useCallback(
    (key) => {
      if (key === 'searchTerm') {
        manut.controles.handleSearchChange({ target: { value: '' } });
        return;
      }
      if (key === 'status') {
        manut.controles.handleFilterChange('status', '');
        osc.handleFilterChange('status', '');
        return;
      }
      manut.controles.handleFilterChange(
        key === 'unidade' ? 'unidadeId' : key,
        ''
      );
    },
    [manut.controles, osc]
  );

  const clearAllFilters = useCallback(() => {
    manut.controles.handleSearchChange({ target: { value: '' } });
    ['status', 'tipo', 'unidadeId'].forEach((f) =>
      manut.controles.handleFilterChange(f, '')
    );
    osc.handleFilterChange('status', '');
  }, [manut.controles, osc]);

  // ─── KPI clicáveis (filtra status) ───────────────────────────────────────
  const activeKpi = useMemo(() => {
    const sM = manut.filtros?.status || '';
    const sO = osc.filtros?.status || '';
    if (!sM && !sO) return 'total';
    if (sM === 'aguardando' && sO === 'aguardando') return 'agendadas';
    if (sM === 'EmAndamento' && !sO) return 'emAndamento';
    if (sM === 'Concluida' && sO === 'Concluida') return 'concluidas';
    if (sM === 'Cancelada' && sO === 'Cancelada') return 'canceladas';
    return null;
  }, [manut.filtros?.status, osc.filtros?.status]);

  const handleSelectKpi = useCallback((kpiKey) => {
    const mapaManut = {
      total: '',
      agendadas: 'aguardando',
      emAndamento: 'EmAndamento',
      concluidas: 'Concluida',
      canceladas: 'Cancelada',
    };
    const mapaOsc = {
      total: '',
      agendadas: 'aguardando',
      emAndamento: '',
      concluidas: 'Concluida',
      canceladas: 'Cancelada',
    };
    const sM = mapaManut[kpiKey];
    const sO = mapaOsc[kpiKey];
    if (sM === undefined) return;
    manut.controles.handleFilterChange('status', sM);
    osc.handleFilterChange('status', sO);
  }, [manut.controles, osc]);

  // ─── Paginação / carregar mais ───────────────────────────────────────────
  const totalCarregado = unifiedItems.length;
  const totalGeral = (manut.pagination?.total ?? 0) + (osc.pagination?.total ?? 0);
  const hasNextPage = Boolean(
    manut.pagination?.hasNextPage || osc.pagination?.hasNextPage
  );
  const loadingMore = manut.loadingMore || osc.loadingMore;
  const loading = (manut.loading || osc.loading) && totalCarregado === 0;
  const error = manut.error;

  const carregarMais = useCallback(() => {
    if (manut.pagination?.hasNextPage) manut.carregarMais();
    if (osc.pagination?.hasNextPage) osc.carregarMais();
  }, [manut, osc]);

  // ─── Delete (só Manutencao tem nesse fluxo; OsCorretiva tem outro) ───────
  const goToCreate = useCallback(() => navigate('/manutencoes/agendar'), [navigate]);

  return {
    items: unifiedItems,
    metricas,
    activeKpi,
    handleSelectKpi,

    searchTerm: manut.searchTerm,
    onSearchChange: manut.controles.handleSearchChange,

    selectFilters,
    activeFilters,
    clearFilter,
    clearAllFilters,

    pagination: {
      totalCarregado,
      total: totalGeral,
      hasNextPage,
    },
    loading,
    loadingMore,
    error,
    carregarMais,

    refetch: () => {
      manut.refetch?.();
      osc.refetch?.();
    },

    deleteModal,
    removerManutencao: manut.removerManutencao,
    removerOs: osc.removerOs,

    goToCreate,
  };
}
