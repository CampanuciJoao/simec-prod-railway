// Ficheiro: src/hooks/seguros/useSegurosPage.js

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
      ['Ativo', 'Expirado', 'Cancelado'].map((status) => ({
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
        value: filtros.seguradora,
        onChange: (value) => setFiltros((prev) => ({ ...prev, seguradora: value })),
        options: seguradorasOptions,
        defaultLabel: 'Todas Seguradoras',
      },
      {
        id: 'status',
        value: filtros.status,
        onChange: (value) => setFiltros((prev) => ({ ...prev, status: value })),
        options: statusOptions,
        defaultLabel: 'Todos Status',
      },
      {
        id: 'unidade',
        value: filtros.unidade,
        onChange: (value) => setFiltros((prev) => ({ ...prev, unidade: value })),
        options: unidadesOptions,
        defaultLabel: 'Todas Unidades',
      },
    ],
    [filtros, setFiltros, seguradorasOptions, statusOptions, unidadesOptions]
  );

  return {
    seguros,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectFiltersConfig,
    deleteModal,
    confirmarExclusao,
    goToCreate: () => navigate('/seguros/adicionar'),
    goToEdit: (id) => navigate(`/seguros/editar/${id}`),
    goToDetails: (id) => navigate(`/seguros/detalhes/${id}`),
  };
}