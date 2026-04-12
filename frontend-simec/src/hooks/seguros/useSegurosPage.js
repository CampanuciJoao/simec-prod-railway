import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSeguros } from './useSeguros';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';

export function useSegurosPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    seguros,
    unidadesDisponiveis,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    removerSeguro,
    getNomeUnidade,
    getStatusDinamico,
  } = useSeguros();

  const deleteModal = useModal();

  const confirmarExclusao = async () => {
    if (!deleteModal.modalData) return;

    try {
      await removerSeguro(deleteModal.modalData.id);
      addToast('Seguro excluído com sucesso!', 'success');
    } catch (err) {
      addToast('Erro ao excluir seguro.', 'error');
    } finally {
      deleteModal.closeModal();
    }
  };

  const seguradorasOptions = useMemo(
    () =>
      [...new Set((seguros || []).map((s) => s.seguradora).filter(Boolean))]
        .sort()
        .map((seguradora) => ({
          value: seguradora,
          label: seguradora,
        })),
    [seguros]
  );

  const statusOptions = useMemo(
    () =>
      ['Ativo', 'Vence em breve', 'Expirado', 'Cancelado'].map((status) => ({
        value: status,
        label: status,
      })),
    []
  );

  const unidadesOptions = useMemo(
    () =>
      (unidadesDisponiveis || []).map((unidade) => ({
        value: unidade.nomeSistema || unidade.nome,
        label: unidade.nomeSistema || unidade.nome,
      })),
    [unidadesDisponiveis]
  );

  const selectFiltersConfig = useMemo(
    () => [
      {
        id: 'seguradora',
        label: 'Seguradora',
        value: filtros.seguradora,
        onChange: (value) => setFiltros((prev) => ({ ...prev, seguradora: value })),
        options: seguradorasOptions,
        defaultLabel: 'Todas seguradoras',
      },
      {
        id: 'status',
        label: 'Status',
        value: filtros.status,
        onChange: (value) => setFiltros((prev) => ({ ...prev, status: value })),
        options: statusOptions,
        defaultLabel: 'Todos os status',
      },
      {
        id: 'unidade',
        label: 'Unidade',
        value: filtros.unidade,
        onChange: (value) => setFiltros((prev) => ({ ...prev, unidade: value })),
        options: unidadesOptions,
        defaultLabel: 'Todas as unidades',
      },
    ],
    [filtros, setFiltros, seguradorasOptions, statusOptions, unidadesOptions]
  );

  const metricas = useMemo(() => {
    const total = seguros.length;
    const ativos = seguros.filter((s) => getStatusDinamico(s) === 'Ativo').length;
    const vencendo = seguros.filter((s) => getStatusDinamico(s) === 'Vence em breve').length;
    const vencidos = seguros.filter((s) => getStatusDinamico(s) === 'Expirado').length;

    return {
      total,
      ativos,
      vencendo,
      vencidos,
    };
  }, [seguros, getStatusDinamico]);

  const activeFilters = useMemo(() => {
    return [
      searchTerm
        ? {
            key: 'searchTerm',
            label: `Busca: ${searchTerm}`,
            value: searchTerm,
          }
        : null,
      filtros.seguradora
        ? {
            key: 'seguradora',
            label: `Seguradora: ${filtros.seguradora}`,
            value: filtros.seguradora,
          }
        : null,
      filtros.status
        ? {
            key: 'status',
            label: `Status: ${filtros.status}`,
            value: filtros.status,
          }
        : null,
      filtros.unidade
        ? {
            key: 'unidade',
            label: `Unidade: ${filtros.unidade}`,
            value: filtros.unidade,
          }
        : null,
    ].filter(Boolean);
  }, [searchTerm, filtros]);

  const clearFilter = (key) => {
    if (key === 'searchTerm') {
      setSearchTerm('');
      return;
    }

    setFiltros((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFiltros({
      seguradora: '',
      status: '',
      unidade: '',
    });
  };

  const onSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filtrarPorStatus = (status) => {
    clearAllFilters();
    setFiltros((prev) => ({ ...prev, status }));
  };

  return {
    seguros,
    loading,
    error,
    searchTerm,
    onSearchChange,
    selectFiltersConfig,
    deleteModal,
    confirmarExclusao,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    getNomeUnidadeSeguro: getNomeUnidade,
    getStatusDinamico,
    filtrarPorStatus,
    goToCreate: () => navigate('/seguros/adicionar'),
    goToEdit: (id) => navigate(`/seguros/editar/${id}`),
    goToDetails: (id) => navigate(`/seguros/detalhes/${id}`),
  };
}