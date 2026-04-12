import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEquipamentos } from './useEquipamentos';
import { useModal } from '../shared/useModal';

const formatarLabel = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
};

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
        label: formatarLabel(tipo),
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
        label: formatarLabel(item),
      })
    );

    return [
      {
        id: 'unidadeId',
        label: 'Unidade',
        value: equipamentosHook.controles.filtros.unidadeId,
        defaultLabel: 'Todas as unidades',
        options: unidades,
        onChange: (value) =>
          equipamentosHook.controles.handleFilterChange('unidadeId', value),
      },
      {
        id: 'tipo',
        label: 'Tipo',
        value: equipamentosHook.controles.filtros.tipo,
        defaultLabel: 'Todos os tipos',
        options: tipos,
        onChange: (value) =>
          equipamentosHook.controles.handleFilterChange('tipo', value),
      },
      {
        id: 'fabricante',
        label: 'Fabricante',
        value: equipamentosHook.controles.filtros.fabricante,
        defaultLabel: 'Todos os fabricantes',
        options: fabricantes,
        onChange: (value) =>
          equipamentosHook.controles.handleFilterChange('fabricante', value),
      },
      {
        id: 'status',
        label: 'Status',
        value: equipamentosHook.controles.filtros.status,
        defaultLabel: 'Todos os status',
        options: status,
        onChange: (value) =>
          equipamentosHook.controles.handleFilterChange('status', value),
      },
    ];
  }, [
    equipamentosHook.unidadesDisponiveis,
    equipamentosHook.equipamentos,
    equipamentosHook.controles.filtros,
    equipamentosHook.controles.handleFilterChange,
  ]);

  const metricas = useMemo(() => {
    const equipamentosBase = Array.isArray(equipamentosHook.equipamentos)
      ? equipamentosHook.equipamentos
      : [];

    const total = equipamentosBase.length;
    const operantes = equipamentosBase.filter((e) => e.status === 'Operante').length;
    const emManutencao = equipamentosBase.filter(
      (e) => e.status === 'EmManutencao'
    ).length;
    const inoperantes = equipamentosBase.filter(
      (e) => e.status === 'Inoperante'
    ).length;
    const usoLimitado = equipamentosBase.filter(
      (e) => e.status === 'UsoLimitado'
    ).length;

    return {
      total,
      operantes,
      emManutencao,
      inoperantes,
      usoLimitado,
    };
  }, [equipamentosHook.equipamentos]);

  const activeFilters = useMemo(() => {
    const filtros = equipamentosHook.controles.filtros;

    const unidadeSelecionada = (equipamentosHook.unidadesDisponiveis || []).find(
      (u) => u.id === filtros.unidadeId
    );

    return [
      filtros.unidadeId
        ? {
            key: 'unidadeId',
            label: `Unidade: ${unidadeSelecionada?.nomeSistema || filtros.unidadeId}`,
            value: filtros.unidadeId,
          }
        : null,
      filtros.tipo
        ? {
            key: 'tipo',
            label: `Tipo: ${formatarLabel(filtros.tipo)}`,
            value: filtros.tipo,
          }
        : null,
      filtros.fabricante
        ? {
            key: 'fabricante',
            label: `Fabricante: ${filtros.fabricante}`,
            value: filtros.fabricante,
          }
        : null,
      filtros.status
        ? {
            key: 'status',
            label: `Status: ${formatarLabel(filtros.status)}`,
            value: filtros.status,
          }
        : null,
      equipamentosHook.controles.searchTerm
        ? {
            key: 'searchTerm',
            label: `Busca: ${equipamentosHook.controles.searchTerm}`,
            value: equipamentosHook.controles.searchTerm,
          }
        : null,
    ].filter(Boolean);
  }, [
    equipamentosHook.controles.filtros,
    equipamentosHook.controles.searchTerm,
    equipamentosHook.unidadesDisponiveis,
  ]);

  const clearFilter = (key) => {
    if (key === 'searchTerm') {
      equipamentosHook.controles.handleSearchChange({ target: { value: '' } });
      return;
    }

    equipamentosHook.controles.handleFilterChange(key, '');
  };

  const clearAllFilters = () => {
    equipamentosHook.controles.handleSearchChange({ target: { value: '' } });
    equipamentosHook.controles.handleFilterChange('unidadeId', '');
    equipamentosHook.controles.handleFilterChange('tipo', '');
    equipamentosHook.controles.handleFilterChange('fabricante', '');
    equipamentosHook.controles.handleFilterChange('status', '');
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.modalData?.id) return;
    await equipamentosHook.removerEquipamento(deleteModal.modalData.id);
    deleteModal.closeModal();
  };

  return {
    ...equipamentosHook,
    searchTerm: equipamentosHook.controles.searchTerm,
    onSearchChange: equipamentosHook.controles.handleSearchChange,
    sortConfig: equipamentosHook.controles.sortConfig,
    requestSort: equipamentosHook.controles.requestSort,
    filtros: equipamentosHook.controles.filtros,
    selectFiltersConfig,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    deleteModal,
    handleConfirmDelete,
    goToCreate: () => navigate('/cadastros/equipamentos/adicionar'),
    goToEdit: (equipamentoId) =>
      navigate(`/cadastros/equipamentos/editar/${equipamentoId}`),
    goToDetails: (equipamentoId) =>
      navigate(`/equipamentos/detalhes/${equipamentoId}`),
    goToFichaTecnica: (equipamentoId) =>
      navigate(`/equipamentos/ficha-tecnica/${equipamentoId}`),
  };
}