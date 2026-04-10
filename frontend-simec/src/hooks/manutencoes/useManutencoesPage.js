import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useManutencoes } from './useManutencoes';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';
import { deleteManutencao } from '../../services/api';

export function useManutencoesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const {
    manutencoes,
    equipamentos,
    unidadesDisponiveis,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    refetch,
  } = useManutencoes();

  const deleteModal = useModal();

  useEffect(() => {
    if (location.state?.filtroTipoInicial || location.state?.filtroEquipamentoId) {
      setFiltros((prev) => ({
        ...prev,
        tipo: location.state.filtroTipoInicial || prev.tipo,
        equipamentoId: location.state.filtroEquipamentoId || prev.equipamentoId,
      }));

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, setFiltros, navigate, location.pathname]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 30 * 1000);

    return () => clearInterval(intervalId);
  }, [refetch]);

  const handleConfirmDelete = async () => {
    if (!deleteModal.modalData) return;

    try {
      await deleteManutencao(deleteModal.modalData.id);
      addToast('Ordem de Serviço excluída.', 'success');
      refetch();
    } catch (err) {
      addToast('Erro ao excluir.', 'error');
    } finally {
      deleteModal.closeModal();
    }
  };

  const goToCreate = () => {
    navigate('/manutencoes/agendar');
  };

  const statusOptions = useMemo(
    () => [
      'Agendada',
      'EmAndamento',
      'Concluida',
      'Cancelada',
      'AguardandoConfirmacao',
    ].map((status) => ({
      value: status,
      label: status.replace(/([A-Z])/g, ' $1').trim(),
    })),
    []
  );

  const equipamentosOptions = useMemo(
    () =>
      (equipamentos || []).map((equipamento) => ({
        value: equipamento.id,
        label: `${equipamento.modelo} (${equipamento.tag})`,
      })),
    [equipamentos]
  );

  const unidadesOptions = useMemo(
    () =>
      (unidadesDisponiveis || []).map((unidade) => ({
        value: unidade.id,
        label: unidade.nomeSistema,
      })),
    [unidadesDisponiveis]
  );

  const selectFiltersConfig = useMemo(
    () => [
      {
        id: 'unidadeId',
        value: filtros.unidadeId,
        onChange: (value) => setFiltros((prev) => ({ ...prev, unidadeId: value })),
        options: unidadesOptions,
        defaultLabel: 'Todas Unidades',
      },
      {
        id: 'equipamentoId',
        value: filtros.equipamentoId,
        onChange: (value) => setFiltros((prev) => ({ ...prev, equipamentoId: value })),
        options: equipamentosOptions,
        defaultLabel: 'Todos Equipamentos',
      },
      {
        id: 'tipo',
        value: filtros.tipo,
        onChange: (value) => setFiltros((prev) => ({ ...prev, tipo: value })),
        options: ['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'],
        defaultLabel: 'Todos Tipos',
      },
      {
        id: 'status',
        value: filtros.status,
        onChange: (value) => setFiltros((prev) => ({ ...prev, status: value })),
        options: statusOptions,
        defaultLabel: 'Todos Status',
      },
    ],
    [filtros, setFiltros, unidadesOptions, equipamentosOptions, statusOptions]
  );

  return {
    manutencoes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectFiltersConfig,
    goToCreate,
    refetch,
    deleteModal,
    handleConfirmDelete,
  };
}