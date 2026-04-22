import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { useEquipamentos } from './useEquipamentos';

export function useEquipamentosPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    equipamentos,
    unidadesDisponiveis,
    filterOptions,
    metricas,
    loading,
    loadingMore,
    error,
    pagination,
    refetch,
    carregarMais,
    controles,
    removerEquipamento,
    atualizarStatusLocalmente,
  } = useEquipamentos();

  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState(null);

  const deleteModal = useMemo(
    () => ({
      isOpen: !!equipamentoParaExcluir,
      openModal: (equipamento) => setEquipamentoParaExcluir(equipamento),
      closeModal: () => setEquipamentoParaExcluir(null),
    }),
    [equipamentoParaExcluir]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!equipamentoParaExcluir?.id) return;

    try {
      await removerEquipamento(equipamentoParaExcluir.id);
      setEquipamentoParaExcluir(null);
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao excluir equipamento.',
        'error'
      );
    }
  }, [equipamentoParaExcluir, removerEquipamento, addToast]);

  const fabricantesDisponiveis = useMemo(
    () =>
      (filterOptions?.fabricantes || []).map((fabricante) => ({
        label: fabricante,
        value: fabricante,
      })),
    [filterOptions]
  );

  const tiposDisponiveis = useMemo(
    () =>
      (filterOptions?.tipos || []).map((tipo) => ({
        label: tipo,
        value: tipo,
      })),
    [filterOptions]
  );

  const selectFiltersConfig = useMemo(
    () => [
      {
        id: 'unidadeId',
        label: 'Unidade',
        defaultLabel: 'Todas',
        value: controles.filtros.unidadeId,
        onChange: (value) => controles.handleFilterChange('unidadeId', value),
        options: unidadesDisponiveis.map((unidade) => ({
          label: unidade.nomeSistema,
          value: unidade.id,
        })),
      },
      {
        id: 'tipo',
        label: 'Tipo',
        defaultLabel: 'Todos',
        value: controles.filtros.tipo,
        onChange: (value) => controles.handleFilterChange('tipo', value),
        options: tiposDisponiveis,
      },
      {
        id: 'fabricante',
        label: 'Fabricante',
        defaultLabel: 'Todos',
        value: controles.filtros.fabricante,
        onChange: (value) => controles.handleFilterChange('fabricante', value),
        options: fabricantesDisponiveis,
      },
      {
        id: 'status',
        label: 'Status',
        defaultLabel: 'Todos',
        value: controles.filtros.status,
        onChange: (value) => controles.handleFilterChange('status', value),
        options: [
          { label: 'Operante', value: 'Operante' },
          { label: 'Em manutenção', value: 'EmManutencao' },
          { label: 'Inoperante', value: 'Inoperante' },
          { label: 'Uso limitado', value: 'UsoLimitado' },
        ],
      },
    ],
    [controles, unidadesDisponiveis, tiposDisponiveis, fabricantesDisponiveis]
  );

  const activeFilters = useMemo(() => {
    const filtrosAtivos = [];

    if (controles.filtros.unidadeId) {
      const unidade = unidadesDisponiveis.find(
        (item) => item.id === controles.filtros.unidadeId
      );

      filtrosAtivos.push({
        key: 'unidadeId',
        value: controles.filtros.unidadeId,
        label: `Unidade: ${unidade?.nomeSistema || controles.filtros.unidadeId}`,
      });
    }

    if (controles.filtros.tipo) {
      filtrosAtivos.push({
        key: 'tipo',
        value: controles.filtros.tipo,
        label: `Tipo: ${controles.filtros.tipo}`,
      });
    }

    if (controles.filtros.fabricante) {
      filtrosAtivos.push({
        key: 'fabricante',
        value: controles.filtros.fabricante,
        label: `Fabricante: ${controles.filtros.fabricante}`,
      });
    }

    if (controles.filtros.status) {
      const mapaStatus = {
        Operante: 'Operante',
        EmManutencao: 'Em manutenção',
        Inoperante: 'Inoperante',
        UsoLimitado: 'Uso limitado',
      };

      filtrosAtivos.push({
        key: 'status',
        value: controles.filtros.status,
        label: `Status: ${mapaStatus[controles.filtros.status] || controles.filtros.status}`,
      });
    }

    return filtrosAtivos;
  }, [controles.filtros, unidadesDisponiveis]);

  const clearFilter = useCallback(
    (key) => {
      controles.handleFilterChange(key, '');
    },
    [controles]
  );

  const clearAllFilters = useCallback(() => {
    controles.handleFilterChange('unidadeId', '');
    controles.handleFilterChange('tipo', '');
    controles.handleFilterChange('fabricante', '');
    controles.handleFilterChange('status', '');
  }, [controles]);

  const onSearchChange = useCallback(
    (event) => {
      controles.handleSearchChange(event);
    },
    [controles]
  );

  const goToCreate = useCallback(() => {
    navigate('/equipamentos/adicionar');
  }, [navigate]);

  const goToFichaTecnica = useCallback(
    (equipamentoId) => {
      navigate(`/equipamentos/ficha-tecnica/${equipamentoId}`);
    },
    [navigate]
  );

  const goToDetalhes = useCallback(
    (equipamentoId) => {
      navigate(`/equipamentos/detalhes/${equipamentoId}`);
    },
    [navigate]
  );

  return {
    equipamentos,
    loading,
    loadingMore,
    error,
    refetch,
    pagination,
    carregarMais,
    metricas,
    searchTerm: controles.searchTerm,
    onSearchChange,
    selectFiltersConfig,
    activeFilters,
    clearFilter,
    clearAllFilters,
    goToCreate,
    goToFichaTecnica,
    goToDetalhes,
    atualizarStatusLocalmente,
    deleteModal,
    handleConfirmDelete,
    openDeleteModal: deleteModal.openModal,
  };
}
