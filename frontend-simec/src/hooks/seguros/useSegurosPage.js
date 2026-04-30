import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSeguros } from './useSeguros';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';
import { TIPO_SEGURO_OPTIONS } from '../../utils/seguros';

export function useSegurosPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    seguros,
    metricas,
    unidadesDisponiveis,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    pagination,
    goToPage,
    removerSeguro,
    getNomeUnidade,
    getStatusDinamico,
  } = useSeguros();

  const deleteModal = useModal();

  const confirmarExclusao = async () => {
    if (!deleteModal.modalData?.id) return;

    try {
      await removerSeguro(deleteModal.modalData.id);
      addToast('Seguro excluído com sucesso!', 'success');
    } catch (err) {
      addToast(
        err?.response?.data?.message || err?.message || 'Erro ao excluir seguro.',
        'error'
      );
    } finally {
      deleteModal.closeModal();
    }
  };

  const seguradorasOptions = useMemo(
    () =>
      [...new Set((seguros || []).map((s) => s.seguradora).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'))
        .map((seguradora) => ({ value: seguradora, label: seguradora })),
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

  const tipoSeguroOptions = useMemo(
    () => TIPO_SEGURO_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const unidadesOptions = useMemo(
    () =>
      (unidadesDisponiveis || [])
        .map((unidade) => ({
          value: unidade.nomeSistema || unidade.nome,
          label: unidade.nomeSistema || unidade.nome,
        }))
        .filter((item) => item.value),
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
      {
        id: 'tipoSeguro',
        label: 'Tipo de seguro',
        value: filtros.tipoSeguro || '',
        onChange: (value) => setFiltros((prev) => ({ ...prev, tipoSeguro: value })),
        options: tipoSeguroOptions,
        defaultLabel: 'Todos os tipos',
      },
    ],
    [filtros, setFiltros, seguradorasOptions, statusOptions, unidadesOptions, tipoSeguroOptions]
  );

  const activeFilters = useMemo(
    () =>
      [
        searchTerm ? { key: 'searchTerm', label: `Busca: ${searchTerm}`, value: searchTerm } : null,
        filtros.seguradora ? { key: 'seguradora', label: `Seguradora: ${filtros.seguradora}`, value: filtros.seguradora } : null,
        filtros.status ? { key: 'status', label: `Status: ${filtros.status}`, value: filtros.status } : null,
        filtros.unidade ? { key: 'unidade', label: `Unidade: ${filtros.unidade}`, value: filtros.unidade } : null,
        filtros.tipoSeguro
          ? {
              key: 'tipoSeguro',
              label: `Tipo: ${tipoSeguroOptions.find((item) => item.value === filtros.tipoSeguro)?.label || filtros.tipoSeguro}`,
              value: filtros.tipoSeguro,
            }
          : null,
      ].filter(Boolean),
    [searchTerm, filtros, tipoSeguroOptions]
  );

  const clearFilter = (key) => {
    if (key === 'searchTerm') { setSearchTerm(''); return; }
    setFiltros((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFiltros({ seguradora: '', status: 'Ativo', unidade: '', tipoSeguro: '' });
  };

  const onSearchChange = (event) => setSearchTerm(event.target.value);

  const filtrarPorStatus = (status) => {
    setSearchTerm('');
    setFiltros({ seguradora: '', status, unidade: '', tipoSeguro: '' });
  };

  return {
    seguros,
    loading,
    error,
    metricas,
    pagination,
    goToPage,
    searchTerm,
    onSearchChange,
    selectFiltersConfig,
    activeFilters,
    clearFilter,
    clearAllFilters,
    filtrarPorStatus,
    deleteModal,
    confirmarExclusao,
    getNomeUnidade,
    getStatusDinamico,
    goToCreate: () => navigate('/seguros/adicionar'),
    goToEdit: (id) => navigate(`/seguros/editar/${id}`),
    goToDetails: (id) => navigate(`/seguros/detalhes/${id}`),
    goToRenovar: (id) => navigate(`/seguros/renovar/${id}`),
  };
}
