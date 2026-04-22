import { useState, useEffect, useMemo } from 'react';
import {
  getUnidades,
  getEquipamentos,
  gerarRelatorio,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { exportarRelatorioPDFLazy } from '@/services/pdf/pdfExportService';
import { getErrorMessage } from '../../utils/getErrorMessage';

export function useRelatoriosPage() {
  const { addToast } = useToast();

  const [filtros, setFiltros] = useState({
    tipoRelatorio: 'inventarioEquipamentos',
    unidadeId: '',
    fabricante: '',
    tipoManutencao: '',
    dataInicio: '',
    dataFim: '',
  });

  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [fabricantesUnicos, setFabricantesUnicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [resultadoRelatorio, setResultadoRelatorio] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function carregarDadosFiltros() {
      setLoadingFiltros(true);
      setError('');

      try {
        const [unidadesData, equipamentosData] = await Promise.all([
          getUnidades(),
          getEquipamentos({
            page: 1,
            pageSize: 500,
            sortBy: 'modelo',
            sortDirection: 'asc',
          }),
        ]);

        setUnidadesDisponiveis(
          (unidadesData || []).sort((a, b) =>
            a.nomeSistema.localeCompare(b.nomeSistema)
          )
        );

        const fabricantes = [
          ...new Set(
            (equipamentosData?.items || [])
              .map((eq) => eq.fabricante)
              .filter(Boolean)
          ),
        ].sort();

        setFabricantesUnicos(fabricantes);
      } catch (err) {
        const message = getErrorMessage(
          err,
          'Erro ao carregar dados para os filtros.'
        );
        setError(message);
        addToast(message, 'error');
      } finally {
        setLoadingFiltros(false);
      }
    }

    carregarDadosFiltros();
  }, [addToast]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleGerarRelatorio = async (e) => {
    e.preventDefault();

    if (
      ['manutencoesRealizadas'].includes(filtros.tipoRelatorio) &&
      (!filtros.dataInicio || !filtros.dataFim)
    ) {
      addToast('Por favor, selecione a Data Início e a Data Fim.', 'error');
      return;
    }

    setLoading(true);
    setResultadoRelatorio(null);
    setError('');

    try {
      const resultado = await gerarRelatorio(filtros);
      setResultadoRelatorio(resultado);
    } catch (err) {
      const message = getErrorMessage(err, 'Falha ao gerar o relatório.');
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!resultadoRelatorio?.dados?.length) {
      addToast('Não há dados para exportar.', 'error');
      return;
    }

    const nomeArquivo = `relatorio_${resultadoRelatorio.tipoRelatorio}_${new Date()
      .toISOString()
      .split('T')[0]}`;

    try {
      await exportarRelatorioPDFLazy(resultadoRelatorio, nomeArquivo);
    } catch (err) {
      const message = getErrorMessage(err, 'Falha ao exportar o relatÃ³rio em PDF.');
      addToast(message, 'error');
    }
  };

  const fabricantesOptions = useMemo(
    () => fabricantesUnicos.map((f) => ({ value: f, label: f })),
    [fabricantesUnicos]
  );

  const unidadesOptions = useMemo(
    () =>
      unidadesDisponiveis.map((u) => ({
        value: u.id,
        label: u.nomeSistema,
      })),
    [unidadesDisponiveis]
  );

  const tipoRelatorioOptions = useMemo(
    () => [
      {
        value: 'inventarioEquipamentos',
        label: 'Inventário de Equipamentos',
      },
      {
        value: 'manutencoesRealizadas',
        label: 'Manutenções Realizadas',
      },
    ],
    []
  );

  const metricas = useMemo(() => {
    return {
      unidades: unidadesDisponiveis.length,
      fabricantes: fabricantesUnicos.length,
      tipoAtual:
        filtros.tipoRelatorio === 'inventarioEquipamentos'
          ? 'Inventário'
          : 'Manutenções',
      registros:
        Array.isArray(resultadoRelatorio?.dados) ? resultadoRelatorio.dados.length : 0,
    };
  }, [unidadesDisponiveis, fabricantesUnicos, filtros.tipoRelatorio, resultadoRelatorio]);

  const activeFilters = useMemo(() => {
    const unidadeSelecionada = unidadesOptions.find(
      (u) => String(u.value) === String(filtros.unidadeId)
    );

    return [
      filtros.tipoRelatorio
        ? {
            key: 'tipoRelatorio',
            label: `Tipo: ${
              filtros.tipoRelatorio === 'inventarioEquipamentos'
                ? 'Inventário'
                : 'Manutenções'
            }`,
            value: filtros.tipoRelatorio,
          }
        : null,
      filtros.unidadeId
        ? {
            key: 'unidadeId',
            label: `Unidade: ${unidadeSelecionada?.label || filtros.unidadeId}`,
            value: filtros.unidadeId,
          }
        : null,
      filtros.fabricante
        ? {
            key: 'fabricante',
            label: `Fabricante: ${filtros.fabricante}`,
            value: filtros.fabricante,
          }
        : null,
      filtros.dataInicio
        ? {
            key: 'dataInicio',
            label: `Início: ${filtros.dataInicio}`,
            value: filtros.dataInicio,
          }
        : null,
      filtros.dataFim
        ? {
            key: 'dataFim',
            label: `Fim: ${filtros.dataFim}`,
            value: filtros.dataFim,
          }
        : null,
    ].filter(Boolean);
  }, [filtros, unidadesOptions]);

  const clearFilter = (key) => {
    setFiltros((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setFiltros({
      tipoRelatorio: 'inventarioEquipamentos',
      unidadeId: '',
      fabricante: '',
      tipoManutencao: '',
      dataInicio: '',
      dataFim: '',
    });
  };

  return {
    filtros,
    setFiltros,
    loading,
    loadingFiltros,
    resultadoRelatorio,
    error,
    fabricantesOptions,
    unidadesOptions,
    tipoRelatorioOptions,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    handleFiltroChange,
    handleGerarRelatorio,
    handleExportarPDF,
  };
}
