import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEquipamentos } from '../useEquipamentos';
import { useModal } from '../shared/useModal';

export function useEquipamentosPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    equipamentos,
    unidadesDisponiveis,
    loading,
    setFiltros,
    removerEquipamento,
    atualizarStatusLocalmente,
    refetch,
    controles,
  } = useEquipamentos();

  const { isOpen, modalData, openModal, closeModal } = useModal();

  // 🔹 filtro vindo da rota
  useEffect(() => {
    if (location.state?.filtroStatusInicial) {
      setFiltros((prev) => ({
        ...prev,
        status: location.state.filtroStatusInicial,
      }));

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, setFiltros, navigate, location.pathname]);

  // 🔹 exclusão
  const handleConfirmDelete = async () => {
    if (!modalData) return;

    try {
      await removerEquipamento(modalData.id);
    } finally {
      closeModal();
    }
  };

  // 🔹 navegação
  const goToFichaTecnica = (id) => {
    navigate(`/equipamentos/ficha-tecnica/${id}`);
  };

  const goToCreate = () => {
    navigate('/cadastros/equipamentos/adicionar');
  };

  // 🔹 filtros dinâmicos
  const selectFiltersConfig = useMemo(() => {
    const tipos = [...new Set((equipamentos || []).map(e => e.tipo).filter(Boolean))]
      .sort()
      .map(tipo => ({ value: tipo, label: tipo }));

    const fabricantes = [...new Set((equipamentos || []).map(e => e.fabricante).filter(Boolean))]
      .sort()
      .map(f => ({ value: f, label: f }));

    const statusOptions = [
      { value: 'Operante', label: 'Operante' },
      { value: 'Inoperante', label: 'Inoperante' },
      { value: 'UsoLimitado', label: 'Uso Limitado' },
      { value: 'EmManutencao', label: 'Em Manutenção' },
    ];

    const unidadesOptions = (unidadesDisponiveis || []).map(u => ({
      value: u.id,
      label: u.nomeSistema,
    }));

    return [
      {
        id: 'unidadeId',
        value: controles.filtros.unidadeId,
        onChange: (value) => controles.handleFilterChange('unidadeId', value),
        options: unidadesOptions,
        defaultLabel: 'Todas Unidades',
      },
      {
        id: 'tipo',
        value: controles.filtros.tipo,
        onChange: (value) => controles.handleFilterChange('tipo', value),
        options: tipos,
        defaultLabel: 'Todos Tipos',
      },
      {
        id: 'fabricante',
        value: controles.filtros.fabricante,
        onChange: (value) => controles.handleFilterChange('fabricante', value),
        options: fabricantes,
        defaultLabel: 'Todos Fabricantes',
      },
      {
        id: 'status',
        value: controles.filtros.status,
        onChange: (value) => controles.handleFilterChange('status', value),
        options: statusOptions,
        defaultLabel: 'Todos Status',
      },
    ];
  }, [equipamentos, unidadesDisponiveis, controles]);

  return {
    equipamentos,
    loading,
    searchTerm: controles.searchTerm,
    onSearchChange: controles.handleSearchChange,
    selectFiltersConfig,
    atualizarStatusLocalmente,
    refetch,
    goToFichaTecnica,
    goToCreate,
    deleteModal: {
      isOpen,
      modalData,
      openModal,
      closeModal,
    },
    handleConfirmDelete,
  };
}