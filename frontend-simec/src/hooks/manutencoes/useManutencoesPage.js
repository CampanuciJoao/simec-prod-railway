import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../shared/useModal';
import { useManutencoes } from './useManutencoes';

const formatarLabel = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
};

export function useManutencoesPage() {
  const navigate = useNavigate();
  const hook = useManutencoes();
  const deleteModal = useModal();

  const selectFiltersConfig = useMemo(() => {
    const base = Array.isArray(hook.manutencoesOriginais)
      ? hook.manutencoesOriginais
      : [];

    const status = [...new Set(base.map((m) => m.status).filter(Boolean))].map(
      (item) => ({
        value: item,
        label: formatarLabel(item),
      })
    );

    const tipos = [...new Set(base.map((m) => m.tipo).filter(Boolean))].map(
      (item) => ({
        value: item,
        label: formatarLabel(item),
      })
    );

    const unidades = [
      ...new Set(
        base
          .map((m) => m.equipamento?.unidade?.nomeSistema)
          .filter(Boolean)
      ),
    ].map((item) => ({
      value: item,
      label: item,
    }));

    return [
      {
        id: 'status',
        label: 'Status',
        value: hook.filtros.status,
        defaultLabel: 'Todos os status',
        options: status,
        onChange: (value) => hook.controles.handleFilterChange('status', value),
      },
      {
        id: 'tipo',
        label: 'Tipo',
        value: hook.filtros.tipo,
        defaultLabel: 'Todos os tipos',
        options: tipos,
        onChange: (value) => hook.controles.handleFilterChange('tipo', value),
      },
      {
        id: 'unidade',
        label: 'Unidade',
        value: hook.filtros.unidade,
        defaultLabel: 'Todas as unidades',
        options: unidades,
        onChange: (value) => hook.controles.handleFilterChange('unidade', value),
      },
    ];
  }, [hook.manutencoesOriginais, hook.filtros, hook.controles]);

  const activeFilters = useMemo(() => {
    return [
      hook.filtros.status
        ? {
            key: 'status',
            label: `Status: ${formatarLabel(hook.filtros.status)}`,
            value: hook.filtros.status,
          }
        : null,
      hook.filtros.tipo
        ? {
            key: 'tipo',
            label: `Tipo: ${formatarLabel(hook.filtros.tipo)}`,
            value: hook.filtros.tipo,
          }
        : null,
      hook.filtros.unidade
        ? {
            key: 'unidade',
            label: `Unidade: ${hook.filtros.unidade}`,
            value: hook.filtros.unidade,
          }
        : null,
      hook.searchTerm
        ? {
            key: 'searchTerm',
            label: `Busca: ${hook.searchTerm}`,
            value: hook.searchTerm,
          }
        : null,
    ].filter(Boolean);
  }, [hook.filtros, hook.searchTerm]);

  const clearFilter = (key) => {
    if (key === 'searchTerm') {
      hook.controles.handleSearchChange({ target: { value: '' } });
      return;
    }

    hook.controles.handleFilterChange(key, '');
  };

  const clearAllFilters = () => {
    hook.controles.handleSearchChange({ target: { value: '' } });
    hook.controles.handleFilterChange('status', '');
    hook.controles.handleFilterChange('tipo', '');
    hook.controles.handleFilterChange('unidade', '');
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.modalData?.id) return;
    await hook.removerManutencao(deleteModal.modalData.id);
    deleteModal.closeModal();
  };

  return {
    ...hook,
    searchTerm: hook.searchTerm,
    onSearchChange: hook.controles.handleSearchChange,
    sortConfig: hook.controles.sortConfig,
    requestSort: hook.controles.requestSort,
    selectFiltersConfig,
    activeFilters,
    clearFilter,
    clearAllFilters,
    deleteModal,
    handleConfirmDelete,
    goToCreate: () => navigate('/manutencoes/nova'),
  };
}