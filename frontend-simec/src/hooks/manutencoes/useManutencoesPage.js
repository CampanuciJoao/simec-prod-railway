// src/hooks/manutencoes/useManutencoesPage.js

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { addManutencao, addNotaAndamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { useModal } from '../shared/useModal';
import { useManutencoes } from './useManutencoes';

function formatarLabel(valor) {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
}

export function useManutencoesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const dataHook = useManutencoes();
  const deleteModal = useModal();

  /**
   * =========================
   * FILTER CONFIG (memoizada)
   * =========================
   */
  const selectFiltersConfig = useMemo(() => {
    const statusOptions = [
      'Agendada',
      'EmAndamento',
      'AguardandoConfirmacao',
      'Concluida',
      'Cancelada',
    ].map((item) => ({
      value: item,
      label: formatarLabel(item),
    }));

    const tipoOptions = ['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'].map(
      (item) => ({
        value: item,
        label: formatarLabel(item),
      })
    );

    const unidadeOptions = (dataHook.unidadesDisponiveis || []).map((unidade) => ({
      value: unidade.id,
      label: unidade.nomeSistema,
    }));

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
        value: dataHook.filtros.unidadeId,
        defaultLabel: 'Todas as unidades',
        options: unidadeOptions,
        onChange: (value) =>
          dataHook.controles.handleFilterChange('unidadeId', value),
      },
    ];
  }, [dataHook.filtros, dataHook.controles, dataHook.unidadesDisponiveis]);

  /**
   * =========================
   * ACTIVE FILTERS
   * =========================
   */
  const activeFilters = useMemo(() => {
    const { status, tipo, unidadeId } = dataHook.filtros;
    const unidade = (dataHook.unidadesDisponiveis || []).find(
      (item) => item.id === unidadeId
    );

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
      unidadeId && {
        key: 'unidade',
        label: `Unidade: ${unidade?.nomeSistema || unidadeId}`,
        value: unidadeId,
      },
      dataHook.searchTerm && {
        key: 'searchTerm',
        label: `Busca: ${dataHook.searchTerm}`,
        value: dataHook.searchTerm,
      },
    ].filter(Boolean);
  }, [dataHook.filtros, dataHook.searchTerm, dataHook.unidadesDisponiveis]);

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

      dataHook.controles.handleFilterChange(
        key === 'unidade' ? 'unidadeId' : key,
        ''
      );
    },
    [dataHook.controles]
  );

  const clearAllFilters = useCallback(() => {
    dataHook.controles.handleSearchChange({ target: { value: '' } });

    ['status', 'tipo', 'unidadeId'].forEach((filtro) =>
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
   * REGISTRAR OCORRENCIA
   * =========================
   */
  const registrarOcorrencia = useCallback(
    async (form) => {
      try {
        const nova = await addManutencao({
          equipamentoId: form.equipamentoId,
          tipo: 'Corretiva',
          descricaoProblemaServico: form.descricaoProblemaServico.trim(),
          solicitante: form.solicitante?.trim() || undefined,
          origemAbertura: form.origemAbertura || undefined,
          numeroChamado: form.numeroChamado?.trim() || undefined,
          tecnicoResponsavel: form.tecnicoResponsavel?.trim() || undefined,
          statusEquipamento: form.statusEquipamento || undefined,
        });

        if (form.detalhe?.trim()) {
          try {
            await addNotaAndamento(nova.id, { nota: form.detalhe.trim() });
          } catch {
            // nota e opcional
          }
        }

        addToast('Ocorrencia registrada. OS aberta para acompanhamento.', 'success');
        dataHook.refetch();
        return true;
      } catch (err) {
        addToast(getErrorMessage(err, 'Erro ao registrar ocorrencia.'), 'error');
        return false;
      }
    },
    [addToast, dataHook]
  );

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

    // ocorrencia corretiva
    registrarOcorrencia,
  };
}
