import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useContratos } from './useContratos';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';
import {
  uploadAnexoContrato,
  deleteAnexoContrato,
} from '../../services/api';
import { getDynamicStatus } from '../../utils/contratos';

export function useContratosPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    contratos,
    contratosOriginais,
    unidadesDisponiveis,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    removerContrato,
    refetch,
  } = useContratos();

  const deleteModal = useModal();
  const [expandidos, setExpandidos] = useState({});
  const [uploadingId, setUploadingId] = useState(null);

  const toggleExpandir = useCallback((contratoId) => {
    setExpandidos((prev) => ({
      ...prev,
      [contratoId]: !prev[contratoId],
    }));
  }, []);

  const confirmarExclusao = useCallback(async () => {
    if (!deleteModal.modalData?.id) return;

    try {
      await removerContrato(deleteModal.modalData.id);
      addToast('Contrato excluído com sucesso!', 'success');
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao excluir contrato.',
        'error'
      );
    } finally {
      deleteModal.closeModal();
    }
  }, [deleteModal, removerContrato, addToast]);

  const handleUploadArquivo = useCallback(
    async (contratoId, event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      setUploadingId(contratoId);

      try {
        await uploadAnexoContrato(contratoId, formData);
        addToast('Documento enviado com sucesso!', 'success');
        await refetch();
      } catch (err) {
        addToast(
          err?.response?.data?.message || 'Erro ao enviar documento.',
          'error'
        );
      } finally {
        setUploadingId(null);
        event.target.value = '';
      }
    },
    [addToast, refetch]
  );

  const handleDeleteAnexo = useCallback(
    async (contratoId, anexoId) => {
      try {
        await deleteAnexoContrato(contratoId, anexoId);
        addToast('Documento removido com sucesso!', 'success');
        await refetch();
      } catch (err) {
        addToast(
          err?.response?.data?.message || 'Erro ao remover documento.',
          'error'
        );
      }
    },
    [addToast, refetch]
  );

  const categoriaOptions = useMemo(() => {
    const categoriasUnicas = [
      ...new Set(
        (contratosOriginais || []).map((c) => c.categoria).filter(Boolean)
      ),
    ];

    return categoriasUnicas.sort().map((categoria) => ({
      value: categoria,
      label: categoria,
    }));
  }, [contratosOriginais]);

  const statusOptions = useMemo(
    () => [
      { value: 'Ativo', label: 'Ativo' },
      { value: 'Vence em breve', label: 'Vence em breve' },
      { value: 'Expirado', label: 'Expirado' },
      { value: 'Cancelado', label: 'Cancelado' },
    ],
    []
  );

  const unidadesOptions = useMemo(
    () =>
      (unidadesDisponiveis || []).map((unidade) => ({
        value: unidade.id,
        label: unidade.nomeSistema || unidade.nome,
      })),
    [unidadesDisponiveis]
  );

  const selectFiltersConfig = useMemo(
    () => [
      {
        id: 'categoria',
        label: 'Categoria',
        value: filtros.categoria,
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, categoria: value })),
        options: categoriaOptions,
        defaultLabel: 'Todas as categorias',
      },
      {
        id: 'status',
        label: 'Status',
        value: filtros.status,
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, status: value })),
        options: statusOptions,
        defaultLabel: 'Todos os status',
      },
      {
        id: 'unidade',
        label: 'Unidade',
        value: filtros.unidade,
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, unidade: value })),
        options: unidadesOptions,
        defaultLabel: 'Todas as unidades',
      },
    ],
    [filtros, setFiltros, categoriaOptions, statusOptions, unidadesOptions]
  );

  const metricas = useMemo(() => {
    const total = contratosOriginais.length;
    const ativos = contratosOriginais.filter(
      (c) => getDynamicStatus(c) === 'Ativo'
    ).length;
    const vencendo = contratosOriginais.filter(
      (c) => getDynamicStatus(c) === 'Vence em breve'
    ).length;
    const expirados = contratosOriginais.filter(
      (c) => getDynamicStatus(c) === 'Expirado'
    ).length;

    return {
      total,
      ativos,
      vencendo,
      expirados,
    };
  }, [contratosOriginais]);

  const activeFilters = useMemo(() => {
    const unidadeSelecionada = (unidadesDisponiveis || []).find(
      (u) => String(u.id) === String(filtros.unidade)
    );

    return [
      searchTerm
        ? {
            key: 'searchTerm',
            label: `Busca: ${searchTerm}`,
            value: searchTerm,
          }
        : null,
      filtros.categoria
        ? {
            key: 'categoria',
            label: `Categoria: ${filtros.categoria}`,
            value: filtros.categoria,
          }
        : null,
      filtros.status
        ? {
            key: 'status',
            label: `Status: ${filtros.status}`,
            value: filtros.status,
          }
        : null,
      filtros.unidade
        ? {
            key: 'unidade',
            label: `Unidade: ${
              unidadeSelecionada?.nomeSistema ||
              unidadeSelecionada?.nome ||
              filtros.unidade
            }`,
            value: filtros.unidade,
          }
        : null,
    ].filter(Boolean);
  }, [searchTerm, filtros, unidadesDisponiveis]);

  const clearFilter = useCallback(
    (key) => {
      if (key === 'searchTerm') {
        setSearchTerm('');
        return;
      }

      setFiltros((prev) => ({ ...prev, [key]: '' }));
    },
    [setSearchTerm, setFiltros]
  );

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFiltros({
      categoria: '',
      status: '',
      unidade: '',
    });
  }, [setSearchTerm, setFiltros]);

  const onSearchChange = useCallback(
    (event) => {
      setSearchTerm(event.target.value);
    },
    [setSearchTerm]
  );

  const filtrarPorStatus = useCallback(
    (status) => {
      setSearchTerm('');
      setFiltros({
        categoria: '',
        status,
        unidade: '',
      });
    },
    [setSearchTerm, setFiltros]
  );

  return {
    contratos,
    loading,
    error,
    searchTerm,
    onSearchChange,
    selectFiltersConfig,
    deleteModal,
    confirmarExclusao,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    filtrarPorStatus,
    getDynamicStatus,
    goToCreate: () => navigate('/contratos/adicionar'),
    goToEdit: (contratoId) => navigate(`/contratos/editar/${contratoId}`),
    expandidos,
    toggleExpandir,
    uploadingId,
    handleUploadArquivo,
    handleDeleteAnexo,
    refetch,
  };
}