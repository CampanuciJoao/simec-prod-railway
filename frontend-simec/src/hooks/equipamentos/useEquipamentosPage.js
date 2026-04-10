// Ficheiro: src/hooks/equipamentos/useEquipamentosPage.js

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEquipamentos } from './useEquipamentos';
import { useModal } from '../shared/useModal';

export function useEquipamentosPage() {
  const navigate = useNavigate();
  const equipamentosHook = useEquipamentos();
  const deleteModal = useModal();

  const selectFiltersConfig = useMemo(() => {
    const unidades = (equipamentosHook.unidadesDisponiveis || []).map((u) => ({
      value: u.id,
      label: u.nomeSistema,
    }));

    const equipamentosBase = Array.isArray(equipamentosHook.equipamentos)
      ? equipamentosHook.equipamentos
      : [];

    const tipos = [...new Set(equipamentosBase.map((e) => e.tipo).filter(Boolean))].map(
      (tipo) => ({
        value: tipo,
        label: tipo,
      })
    );

    const fabricantes = [
      ...new Set(equipamentosBase.map((e) => e.fabricante).filter(Boolean)),
    ].map((fabricante) => ({
      value: fabricante,
      label: fabricante,
    }));

    const status = [...new Set(equipamentosBase.map((e) => e.status).filter(Boolean))].map(
      (item) => ({
        value: item,
        label: item,
      })
    );

    return [
      {
        name: 'unidadeId',
        value: equipamentosHook.controles.filtros.unidadeId,
        options: [{ value: '', label: 'Todas as unidades' }, ...unidades],
        onChange: (value) => equipamentosHook.controles.handleFilterChange('unidadeId', value),
      },
      {
        name: 'tipo',
        value: equipamentosHook.controles.filtros.tipo,
        options: [{ value: '', label: 'Todos os tipos' }, ...tipos],
        onChange: (value) => equipamentosHook.controles.handleFilterChange('tipo', value),
      },
      {
        name: 'fabricante',
        value: equipamentosHook.controles.filtros.fabricante,
        options: [{ value: '', label: 'Todos os fabricantes' }, ...fabricantes],
        onChange: (value) => equipamentosHook.controles.handleFilterChange('fabricante', value),
      },
      {
        name: 'status',
        value: equipamentosHook.controles.filtros.status,
        options: [{ value: '', label: 'Todos os status' }, ...status],
        onChange: (value) => equipamentosHook.controles.handleFilterChange('status', value),
      },
    ];
  }, [
    equipamentosHook.unidadesDisponiveis,
    equipamentosHook.equipamentos,
    equipamentosHook.controles.filtros,
    equipamentosHook.controles.handleFilterChange,
  ]);

  const handleConfirmDelete = async () => {
    if (!deleteModal.modalData?.id) return;
    await equipamentosHook.removerEquipamento(deleteModal.modalData.id);
    deleteModal.closeModal();
  };

  return {
    ...equipamentosHook,
    searchTerm: equipamentosHook.controles.searchTerm,
    setSearchTerm: (valueOrEvent) => {
      if (typeof valueOrEvent === 'string') {
        equipamentosHook.controles.handleFilterChange('searchTerm', valueOrEvent);
        return;
      }
      equipamentosHook.controles.handleSearchChange(valueOrEvent);
    },
    sortConfig: equipamentosHook.controles.sortConfig,
    requestSort: equipamentosHook.controles.requestSort,
    filtros: equipamentosHook.controles.filtros,
    selectFiltersConfig,
    deleteModal,
    handleConfirmDelete,
    goToCreate: () => navigate('/cadastros/equipamentos/adicionar'),
    goToEdit: (equipamentoId) => navigate(`/cadastros/equipamentos/editar/${equipamentoId}`),
    goToDetails: (equipamentoId) => navigate(`/equipamentos/detalhes/${equipamentoId}`),
  };
}