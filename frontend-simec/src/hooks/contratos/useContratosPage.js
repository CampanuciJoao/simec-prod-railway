// Ficheiro: src/hooks/contratos/useContratosPage.js

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useContratos } from './useContratos';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';
import {
  deleteContrato,
  uploadAnexoContrato,
  deleteAnexoContrato,
} from '../../services/api';

export function useContratosPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    contratos,
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

  const toggleExpandir = (contratoId) => {
    setExpandidos((prev) => ({
      ...prev,
      [contratoId]: !prev[contratoId],
    }));
  };

  const confirmarExclusao = async () => {
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
  };

  const handleUploadArquivo = async (contratoId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('arquivo', file);

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
  };

  const handleDeleteAnexo = async (contratoId, anexoId) => {
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
  };

  const goToCreate = () => {
    navigate('/contratos/adicionar');
  };

  const goToEdit = (contratoId) => {
    navigate(`/contratos/editar/${contratoId}`);
  };

  const categoriaOptions = useMemo(() => {
    const categoriasUnicas = [
      ...new Set((contratos || []).map((c) => c.categoria).filter(Boolean)),
    ];

    return categoriasUnicas.map((categoria) => ({
      value: categoria,
      label: categoria,
    }));
  }, [contratos]);

  const statusOptions = useMemo(
    () => [
      { value: 'Ativo', label: 'Ativo' },
      { value: 'Expirado', label: 'Expirado' },
      { value: 'Cancelado', label: 'Cancelado' },
      { value: 'Vence em breve', label: 'Vence em breve' },
    ],
    []
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
        id: 'categoria',
        value: filtros.categoria,
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, categoria: value })),
        options: categoriaOptions,
        defaultLabel: 'Todas Categorias',
      },
      {
        id: 'status',
        value: filtros.status,
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, status: value })),
        options: statusOptions,
        defaultLabel: 'Todos Status',
      },
      {
        id: 'unidade',
        value: filtros.unidade,
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, unidade: value })),
        options: unidadesOptions,
        defaultLabel: 'Todas Unidades',
      },
    ],
    [filtros, setFiltros, categoriaOptions, statusOptions, unidadesOptions]
  );

  return {
    contratos,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectFiltersConfig,
    deleteModal,
    confirmarExclusao,
    goToCreate,
    goToEdit,
    expandidos,
    toggleExpandir,
    uploadingId,
    handleUploadArquivo,
    handleDeleteAnexo,
    refetch,
  };
}