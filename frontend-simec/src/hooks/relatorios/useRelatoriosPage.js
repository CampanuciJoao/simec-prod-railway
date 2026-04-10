import { useState, useEffect, useMemo } from 'react';
import { getUnidades, getEquipamentos, gerarRelatorio } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { exportarRelatorioPDF } from '../../utils/pdfUtils';
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
          getEquipamentos(),
        ]);

        setUnidadesDisponiveis(
          (unidadesData || []).sort((a, b) => a.nomeSistema.localeCompare(b.nomeSistema))
        );

        const fabricantes = [
          ...new Set((equipamentosData || []).map((eq) => eq.fabricante).filter(Boolean)),
        ].sort();

        setFabricantesUnicos(fabricantes);
      } catch (err) {
        const message = getErrorMessage(err, 'Erro ao carregar dados para os filtros.');
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

  const handleExportarPDF = () => {
    if (!resultadoRelatorio?.dados?.length) {
      addToast('Não há dados para exportar.', 'error');
      return;
    }

    const nomeArquivo = `relatorio_${resultadoRelatorio.tipoRelatorio}_${new Date()
      .toISOString()
      .split('T')[0]}`;

    exportarRelatorioPDF(resultadoRelatorio, nomeArquivo);
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

  return {
    filtros,
    setFiltros,
    loading,
    loadingFiltros,
    resultadoRelatorio,
    error,
    fabricantesOptions,
    unidadesOptions,
    handleFiltroChange,
    handleGerarRelatorio,
    handleExportarPDF,
  };
}