import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOsCorretiva } from './useOsCorretiva';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';

export function useOsCorretivaPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const dataHook = useOsCorretiva();
  const deleteModal = useModal();

  // Array format expected by GlobalFilterBar
  const selectFiltersConfig = useMemo(() => [
    {
      id: 'tipo',
      label: 'Tipo',
      defaultLabel: 'Todos',
      value: dataHook.filtros.tipo,
      onChange: (value) => dataHook.handleFilterChange('tipo', value),
      options: [
        { value: 'Ocorrencia', label: 'Ocorrência' },
        { value: 'Corretiva', label: 'Corretiva' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      defaultLabel: 'Todos',
      value: dataHook.filtros.status,
      onChange: (value) => dataHook.handleFilterChange('status', value),
      options: [
        { value: 'Aberta', label: 'Aberta' },
        { value: 'EmAndamento', label: 'Em andamento' },
        { value: 'AguardandoTerceiro', label: 'Aguardando terceiro' },
        { value: 'Concluida', label: 'Concluída' },
      ],
    },
  ], [dataHook.filtros, dataHook.handleFilterChange]);

  const activeFilters = useMemo(() => {
    const active = [];
    if (dataHook.filtros.tipo) {
      const opt = selectFiltersConfig.find((f) => f.id === 'tipo')?.options.find((o) => o.value === dataHook.filtros.tipo);
      active.push({ key: 'tipo', label: opt?.label || dataHook.filtros.tipo });
    }
    if (dataHook.filtros.status) {
      const opt = selectFiltersConfig.find((f) => f.id === 'status')?.options.find((o) => o.value === dataHook.filtros.status);
      active.push({ key: 'status', label: opt?.label || dataHook.filtros.status });
    }
    return active;
  }, [dataHook.filtros, selectFiltersConfig]);

  const clearFilter = useCallback((key) => {
    dataHook.handleFilterChange(key, '');
  }, [dataHook]);

  const clearAllFilters = useCallback(() => {
    dataHook.handleFilterChange('tipo', '');
    dataHook.handleFilterChange('status', '');
  }, [dataHook]);

  const handleConfirmDelete = useCallback(async () => {
    const id = deleteModal.modalData?.id;
    if (!id) return;
    try {
      await dataHook.removerOs(id);
      deleteModal.closeModal();
    } catch {
      // toast already shown in hook
    }
  }, [deleteModal, dataHook]);

  const goToCreate = useCallback(() => navigate('/os-corretiva/abrir'), [navigate]);

  return {
    ...dataHook,
    selectFiltersConfig,
    activeFilters,
    clearFilter,
    clearAllFilters,
    deleteModal,
    handleConfirmDelete,
    goToCreate,
  };
}
