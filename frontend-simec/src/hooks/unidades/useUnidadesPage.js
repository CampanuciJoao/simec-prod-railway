import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUnidades } from './useUnidades';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';

export function useUnidadesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    unidades,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    removerUnidade,
  } = useUnidades();

  const deleteModal = useModal();

  const confirmarExclusao = async () => {
    if (!deleteModal.modalData) return;

    try {
      await removerUnidade(deleteModal.modalData.id);
      addToast('Unidade excluída com sucesso!', 'success');
    } catch (err) {
      addToast(err?.message || 'Erro ao excluir unidade.', 'error');
    } finally {
      deleteModal.closeModal();
    }
  };

  const cidadesOptions = useMemo(() => {
    const cidades = [...new Set(unidades.map((u) => u.cidade).filter(Boolean))].sort();

    return cidades.map((cidade) => ({
      value: cidade,
      label: cidade,
    }));
  }, [unidades]);

  const estadosOptions = useMemo(() => {
    const estados = [...new Set(unidades.map((u) => u.estado).filter(Boolean))].sort();

    return estados.map((estado) => ({
      value: estado,
      label: estado,
    }));
  }, [unidades]);

  const selectFiltersConfig = useMemo(
    () => [
      {
        id: 'cidade',
        label: 'Cidade',
        value: filtros.cidade,
        onChange: (value) => setFiltros((prev) => ({ ...prev, cidade: value })),
        options: cidadesOptions,
        defaultLabel: 'Todas as cidades',
      },
      {
        id: 'estado',
        label: 'Estado',
        value: filtros.estado,
        onChange: (value) => setFiltros((prev) => ({ ...prev, estado: value })),
        options: estadosOptions,
        defaultLabel: 'Todos os estados',
      },
    ],
    [filtros, setFiltros, cidadesOptions, estadosOptions]
  );

  const metricas = useMemo(() => {
    const total = unidades.length;
    const comCnpj = unidades.filter((u) => u.cnpj).length;
    const semCnpj = unidades.filter((u) => !u.cnpj).length;
    const cidadesAtendidas = new Set(unidades.map((u) => u.cidade).filter(Boolean)).size;

    return {
      total,
      comCnpj,
      semCnpj,
      cidadesAtendidas,
    };
  }, [unidades]);

  const activeFilters = useMemo(() => {
    return [
      searchTerm
        ? {
            key: 'searchTerm',
            label: `Busca: ${searchTerm}`,
            value: searchTerm,
          }
        : null,
      filtros.cidade
        ? {
            key: 'cidade',
            label: `Cidade: ${filtros.cidade}`,
            value: filtros.cidade,
          }
        : null,
      filtros.estado
        ? {
            key: 'estado',
            label: `Estado: ${filtros.estado}`,
            value: filtros.estado,
          }
        : null,
    ].filter(Boolean);
  }, [searchTerm, filtros]);

  const clearFilter = (key) => {
    if (key === 'searchTerm') {
      setSearchTerm('');
      return;
    }

    setFiltros((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFiltros({
      cidade: '',
      estado: '',
    });
  };

  const onSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return {
    unidades,
    loading,
    error,
    searchTerm,
    onSearchChange,
    selectFiltersConfig,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    deleteModal,
    confirmarExclusao,
    goToCreate: () => navigate('/cadastros/unidades/adicionar'),
    goToEdit: (id) => navigate(`/cadastros/unidades/editar/${id}`),
  };
}