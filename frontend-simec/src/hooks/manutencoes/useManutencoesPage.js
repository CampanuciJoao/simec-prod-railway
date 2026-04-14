// src/hooks/manutencoes/useManutencoesPage.js

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../shared/useModal';
import { useManutencoes } from './useManutencoes';

function formatarLabel(valor) {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
}

function buildUniqueOptions(list, accessor) {
  return [...new Set(list.map(accessor).filter(Boolean))].map((item) => ({
    value: item,
    label: formatarLabel(item),
  }));
}

export function useManutencoesPage() {
  const navigate = useNavigate();
  const dataHook = useManutencoes();
  const deleteModal = useModal();

  const baseList = useMemo(() => {
    return Array.isArray(dataHook.manutencoesOriginais)
      ? dataHook.manutencoesOriginais
      : [];
  }, [dataHook.manutencoesOriginais]);

  /**
   * =========================
   * FILTER CONFIG (memoizada)
   * =========================
   */
  const selectFiltersConfig = useMemo(() => {
    const statusOptions = buildUniqueOptions(baseList, (m) => m.status);
    const tipoOptions = buildUniqueOptions(baseList, (m) => m.tipo);
    const unidadeOptions = buildUniqueOptions(
      baseList,
      (m) => m.equipamento?.unidade?.nomeSistema
    );

    return [
      {
        id: 'status',
        label: 'Status',
        value: dataHook.filtros.status,
        defaultLabel: 'Todos os status',
        options: statusOptions,
        onChange: (value) =>
          dataHook.controles.handleFilterChange('status', value),
      },
      {
        id: 'tipo',
        label: 'Tipo',
        value: dataHook.filtros.tipo,
        defaultLabel: 'Todos os tipos',
        options: tipoOptions,
        onChange: (value) =>
          dataHook.controles.handleFilterChange('tipo', value),
      },
      {
        id: 'unidade',
        label: 'Unidade',
        value: dataHook.filtros.unidade,
        defaultLabel: 'Todas as unidades',
        options: unidadeOptions,
        onChange: (value) =>
          dataHook.controles.handleFilterChange('unidade', value),
      },
    ];
  }, [baseList, dataHook.filtros, dataHook.controles]);

  /**
   * =========================
   * ACTIVE FILTERS
   * =========================
   */
  const activeFilters = useMemo(() => {
    const { status, tipo, unidade } = dataHook.filtros;

    return [
      status && {
        key: 'status',
        label: `Status: ${formatarLabel(status)}`,
        value: status,
      },
      tipo && {
        key: 'tipo',
        label: `Tipo: ${formatarLabel(tipo)}`,
        value: tipo,
      },
      unidade && {
        key: 'unidade',
        label: `Unidade: ${unidade}`,
        value: unidade,
      },
      dataHook.searchTerm && {
        key: 'searchTerm',
        label: `Busca: ${dataHook.searchTerm}`,
        value: dataHook.searchTerm,
      },
    ].filter(Boolean);
  }, [dataHook.filtros, dataHook.searchTerm]);

  /**
   * =========================
   * FILTER ACTIONS
   * =========================
   */
  const clearFilter = useCallback(
    (key) => {
      if (key === 'searchTerm') {
        dataHook.controles.handleSearchChange({ target: { value: '' } });
        return;
      }

      dataHook.controles.handleFilterChange(key, '');
    },
    [dataHook.controles]
  );

  const clearAllFilters = useCallback(() => {
    dataHook.controles.handleSearchChange({ target: { value: '' } });

    ['status', 'tipo', 'unidade'].forEach((filtro) =>
      dataHook.controles.handleFilterChange(filtro, '')
    );
  }, [dataHook.controles]);

  /**
   * =========================
   * DELETE FLOW
   * =========================
   */
  const handleConfirmDelete = useCallback(async () => {
    const id = deleteModal.modalData?.id;

    if (!id) return;

    await dataHook.removerManutencao(id);
    deleteModal.closeModal();
  }, [deleteModal, dataHook]);

  /**
   * =========================
   * NAVIGATION
   * =========================
   */
  const goToCreate = useCallback(() => {
    navigate('/manutencoes/agendar');
  }, [navigate]);

  /**
   * =========================
   * RETURN PADRONIZADO
   * =========================
   */
  return {
    ...dataHook,

    // filtros
    selectFiltersConfig,
    activeFilters,
    clearFilter,
    clearAllFilters,

    // busca
    searchTerm: dataHook.searchTerm,
    onSearchChange: dataHook.controles.handleSearchChange,

    // sort
    sortConfig: dataHook.controles.sortConfig,
    requestSort: dataHook.controles.requestSort,

    // modal
    deleteModal,
    handleConfirmDelete,

    // nav
    goToCreate,
  };
}