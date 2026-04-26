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

  const selectFiltersConfig = useMemo(() => ({
    tipo: {
      label: 'Tipo',
      options: [
        { value: '', label: 'Todos' },
        { value: 'Ocorrencia', label: 'Ocorrência' },
        { value: 'Corretiva', label: 'Corretiva' },
      ],
    },
    status: {
      label: 'Status',
      options: [
        { value: '', label: 'Todos' },
        { value: 'Aberta', label: 'Aberta' },
        { value: 'EmAndamento', label: 'Em andamento' },
        { value: 'AguardandoTerceiro', label: 'Aguardando terceiro' },
        { value: 'Concluida', label: 'Concluída' },
      ],
    },
  }), []);

  const activeFilters = useMemo(() => {
    const active = [];
    if (dataHook.filtros.tipo) {
      const opt = selectFiltersConfig.tipo.options.find((o) => o.value === dataHook.filtros.tipo);
      active.push({ key: 'tipo', label: opt?.label || dataHook.filtros.tipo });
    }
    if (dataHook.filtros.status) {
      const opt = selectFiltersConfig.status.options.find((o) => o.value === dataHook.filtros.status);
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
