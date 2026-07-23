import { useState, useEffect, useMemo } from 'react';
import {
  getUnidades,
  getEquipamentos,
  gerarRelatorio,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { exportarRelatorioPDF, exportarOrcamentoCqPDF } from '@/services/api/pdfApi';
import { getErrorMessage } from '../../utils/getErrorMessage';

export function useRelatoriosPage() {
  const { addToast } = useToast();

  const [filtros, setFiltros] = useState({
    tipoRelatorio: 'inventarioEquipamentos',
    unidadeId: '',
    fabricante: '',
    tipo: '',
    tipoManutencao: '',
    dataInicio: '',
    dataFim: '',
    // Filtros do relatorio de seguros
    escopoSeguro: '',      // '' = todos | empresarial | equipamento | veiculo | unidade
    status: '',
    seguradora: '',
    vencimentoInicio: '',
    vencimentoFim: '',
  });

  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [fabricantesUnicos, setFabricantesUnicos] = useState([]);
  const [tiposUnicos, setTiposUnicos] = useState([]);
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

        const tipos = [
          ...new Set(
            (equipamentosData?.items || [])
              .map((eq) => eq.tipo)
              .filter(Boolean)
          ),
        ].sort();

        setFabricantesUnicos(fabricantes);
        setTiposUnicos(tipos);
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

    try {
      // Orcamento CQ tem PDF dedicado com layout pre-formatado (agrupado
      // por unidade com cabecalho CNPJ etc), diferente do PDF generico
      // de exportarRelatorioPDF. Roteamos pra esse PDF especifico.
      if (resultadoRelatorio.tipoRelatorio === 'orcamentoCq') {
        await exportarOrcamentoCqPDF({
          unidadeIds: filtros.unidadeId ? [filtros.unidadeId] : null,
        });
        addToast('Inventário de CQ baixado.', 'success');
        return;
      }

      const nomeArquivo = `relatorio_${resultadoRelatorio.tipoRelatorio}_${new Date()
        .toISOString()
        .split('T')[0]}`;
      await exportarRelatorioPDF(filtros, `${nomeArquivo}.pdf`);
    } catch (err) {
      const message = getErrorMessage(err, 'Falha ao exportar o relatório em PDF.');
      addToast(message, 'error');
    }
  };

  const fabricantesOptions = useMemo(
    () => fabricantesUnicos.map((f) => ({ value: f, label: f })),
    [fabricantesUnicos]
  );

  const tiposOptions = useMemo(
    () => tiposUnicos.map((t) => ({ value: t, label: t })),
    [tiposUnicos]
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
      {
        value: 'orcamentoCq',
        label: 'Inventário Controle de Qualidade',
      },
      {
        value: 'inventarioSeguros',
        label: 'Relatório de Seguros',
      },
    ],
    []
  );

  const escopoSeguroOptions = useMemo(
    () => [
      { value: '',            label: 'Todos' },
      { value: 'empresarial', label: 'Empresarial' },
      { value: 'equipamento', label: 'Vinculado a equipamento' },
      { value: 'veiculo',     label: 'Vinculado a veículo' },
      { value: 'unidade',     label: 'Vinculado a unidade' },
    ],
    []
  );

  const statusSeguroOptions = useMemo(
    () => [
      { value: '',            label: 'Todos' },
      { value: 'Ativo',       label: 'Ativo' },
      { value: 'Vigente',     label: 'Vigente' },
      { value: 'Expirado',    label: 'Expirado' },
      { value: 'Cancelado',   label: 'Cancelado' },
      { value: 'Substituido', label: 'Substituído' },
    ],
    []
  );

  const metricas = useMemo(() => {
    const tipoLabel = {
      inventarioEquipamentos: 'Inventário',
      manutencoesRealizadas: 'Manutenções',
      orcamentoCq: 'Inventário CQ',
      inventarioSeguros: 'Seguros',
    }[filtros.tipoRelatorio] || '—';
    return {
      unidades: unidadesDisponiveis.length,
      fabricantes: fabricantesUnicos.length,
      tipoAtual: tipoLabel,
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
              {
                inventarioEquipamentos: 'Inventário',
                manutencoesRealizadas: 'Manutenções',
                orcamentoCq: 'Inventário CQ',
                inventarioSeguros: 'Seguros',
              }[filtros.tipoRelatorio] || filtros.tipoRelatorio
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
      filtros.tipo
        ? {
            key: 'tipo',
            label: `Tipo: ${filtros.tipo}`,
            value: filtros.tipo,
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
      // Filtros do relatorio de seguros
      filtros.escopoSeguro
        ? {
            key: 'escopoSeguro',
            label: `Escopo: ${
              {
                empresarial: 'Empresarial',
                equipamento: 'Vinculado a equipamento',
                veiculo:     'Vinculado a veículo',
                unidade:     'Vinculado a unidade',
              }[filtros.escopoSeguro] || filtros.escopoSeguro
            }`,
            value: filtros.escopoSeguro,
          }
        : null,
      filtros.status
        ? {
            key: 'status',
            label: `Status: ${filtros.status}`,
            value: filtros.status,
          }
        : null,
      filtros.seguradora
        ? {
            key: 'seguradora',
            label: `Seguradora: ${filtros.seguradora}`,
            value: filtros.seguradora,
          }
        : null,
      filtros.vencimentoInicio
        ? {
            key: 'vencimentoInicio',
            label: `Vence de: ${filtros.vencimentoInicio}`,
            value: filtros.vencimentoInicio,
          }
        : null,
      filtros.vencimentoFim
        ? {
            key: 'vencimentoFim',
            label: `Vence até: ${filtros.vencimentoFim}`,
            value: filtros.vencimentoFim,
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
      tipo: '',
      tipoManutencao: '',
      dataInicio: '',
      dataFim: '',
      escopoSeguro: '',
      status: '',
      seguradora: '',
      vencimentoInicio: '',
      vencimentoFim: '',
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
    tiposOptions,
    unidadesOptions,
    tipoRelatorioOptions,
    escopoSeguroOptions,
    statusSeguroOptions,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    handleFiltroChange,
    handleGerarRelatorio,
    handleExportarPDF,
  };
}
