import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { useEquipamentos } from '../hooks/useEquipamentos';
import { useModal } from '../hooks/useModal';
import { useEquipamentosExpansion } from '../hooks/useEquipamentosExpansion';

import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import SkeletonCard from '../components/SkeletonCard';
import EquipamentosList from '../components/equipamentos/EquipamentosList';

function EquipamentosPage() {
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

  const expansion = useEquipamentosExpansion('cadastro');

  useEffect(() => {
    if (location.state?.filtroStatusInicial) {
      setFiltros((prev) => ({
        ...prev,
        status: location.state.filtroStatusInicial,
      }));

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, setFiltros, navigate, location.pathname]);

  const handleConfirmDelete = async () => {
    if (!modalData) return;

    try {
      await removerEquipamento(modalData.id);
    } finally {
      closeModal();
    }
  };

  const handleGoToFichaTecnica = (equipamentoId) => {
    navigate(`/equipamentos/ficha-tecnica/${equipamentoId}`);
  };

  const tiposOptions = [...new Set((equipamentos || []).map((e) => e.tipo).filter(Boolean))]
    .sort()
    .map((tipo) => ({ value: tipo, label: tipo }));

  const fabricantesOptions = [...new Set((equipamentos || []).map((e) => e.fabricante).filter(Boolean))]
    .sort()
    .map((fabricante) => ({ value: fabricante, label: fabricante }));

  const statusOptions = [
    { value: 'Operante', label: 'Operante' },
    { value: 'Inoperante', label: 'Inoperante' },
    { value: 'UsoLimitado', label: 'Uso Limitado' },
    { value: 'EmManutencao', label: 'Em Manutenção' },
  ];

  const unidadesOptions = (unidadesDisponiveis || []).map((unidade) => ({
    value: unidade.id,
    label: unidade.nomeSistema,
  }));

  const selectFiltersConfig = [
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
      options: tiposOptions,
      defaultLabel: 'Todos Tipos',
    },
    {
      id: 'fabricante',
      value: controles.filtros.fabricante,
      onChange: (value) => controles.handleFilterChange('fabricante', value),
      options: fabricantesOptions,
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

  if (loading && equipamentos.length === 0) {
    return (
      <div className="page-content-wrapper p-6">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="page-content-wrapper p-6 bg-[#f8fafc] min-h-screen font-sans">
      <ModalConfirmacao
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmDelete}
        title="Excluir"
        message="Deseja excluir este registro?"
        isDestructive={true}
      />

      <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-xl shadow-lg mb-8">
        <h1 className="text-lg font-bold text-white m-0 tracking-tight uppercase">
          Gerenciamento de Ativos
        </h1>

        <button
          className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black transition-all border-none cursor-pointer flex items-center gap-2 shadow-md uppercase tracking-wider"
          onClick={() => navigate('/cadastros/equipamentos/adicionar')}
        >
          <FontAwesomeIcon icon={faPlus} />
          Adicionar Equipamento
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <GlobalFilterBar
          searchTerm={controles.searchTerm}
          onSearchChange={controles.handleSearchChange}
          searchPlaceholder="Buscar por modelo, tag ou unidade..."
          selectFilters={selectFiltersConfig}
        />
      </div>

      {equipamentos.length > 0 ? (
        <EquipamentosList
          equipamentos={equipamentos}
          expansion={expansion}
          onGoToFichaTecnica={handleGoToFichaTecnica}
          onStatusUpdated={atualizarStatusLocalmente}
          onRefresh={refetch}
        />
      ) : (
        <div className="py-20 text-center text-slate-400 font-medium italic bg-white rounded-2xl border border-dashed border-slate-200">
          Nenhum equipamento encontrado.
        </div>
      )}
    </div>
  );
}

export default EquipamentosPage;