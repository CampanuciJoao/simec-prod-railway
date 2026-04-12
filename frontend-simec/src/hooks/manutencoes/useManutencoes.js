import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getManutencoes,
  deleteManutencao,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export const useManutencoes = () => {
  const [manutencoesOriginais, setManutencoesOriginais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    unidade: '',
  });

  const [sortConfig, setSortConfig] = useState({
    key: 'dataHoraAgendamentoInicio',
    direction: 'descending',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getManutencoes();
      setManutencoesOriginais(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      addToast('Erro ao carregar manutenções.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const manutencoesFiltradas = useMemo(() => {
    let filtrados = [...manutencoesOriginais];

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();

      filtrados = filtrados.filter((m) => {
        return (
          m.numeroOS?.toLowerCase().includes(termo) ||
          m.descricaoProblemaServico?.toLowerCase().includes(termo) ||
          m.equipamento?.modelo?.toLowerCase().includes(termo) ||
          m.equipamento?.tag?.toLowerCase().includes(termo) ||
          m.equipamento?.unidade?.nomeSistema?.toLowerCase().includes(termo)
        );
      });
    }

    if (filtros.status) {
      filtrados = filtrados.filter((m) => m.status === filtros.status);
    }

    if (filtros.tipo) {
      filtrados = filtrados.filter((m) => m.tipo === filtros.tipo);
    }

    if (filtros.unidade) {
      filtrados = filtrados.filter(
        (m) => m.equipamento?.unidade?.nomeSistema === filtros.unidade
      );
    }

    return filtrados;
  }, [manutencoesOriginais, searchTerm, filtros]);

  const manutencoesOrdenadas = useMemo(() => {
    const ordenadas = [...manutencoesFiltradas];

    if (!sortConfig.key) return ordenadas;

    ordenadas.sort((a, b) => {
      let valA;
      let valB;

      switch (sortConfig.key) {
        case 'unidade':
          valA = a.equipamento?.unidade?.nomeSistema || '';
          valB = b.equipamento?.unidade?.nomeSistema || '';
          break;
        case 'equipamento':
          valA = a.equipamento?.modelo || '';
          valB = b.equipamento?.modelo || '';
          break;
        default:
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
          break;
      }

      if (
        sortConfig.key === 'dataHoraAgendamentoInicio' ||
        sortConfig.key === 'dataHoraAgendamentoFim' ||
        sortConfig.key === 'dataConclusao' ||
        sortConfig.key === 'createdAt'
      ) {
        const dataA = valA ? new Date(valA).getTime() : 0;
        const dataB = valB ? new Date(valB).getTime() : 0;
        return sortConfig.direction === 'ascending'
          ? dataA - dataB
          : dataB - dataA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();

      if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    return ordenadas;
  }, [manutencoesFiltradas, sortConfig]);

  const metricas = useMemo(() => {
    const base = manutencoesOrdenadas;

    return {
      total: base.length,
      emAndamento: base.filter((m) => m.status === 'EmAndamento').length,
      aguardando: base.filter((m) => m.status === 'AguardandoConfirmacao').length,
      concluidas: base.filter((m) => m.status === 'Concluida').length,
      canceladas: base.filter((m) => m.status === 'Cancelada').length,
    };
  }, [manutencoesOrdenadas]);

  const requestSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const removerManutencao = async (id) => {
    try {
      await deleteManutencao(id);
      addToast('Manutenção excluída!', 'success');
      fetchData();
    } catch (err) {
      addToast('Erro ao excluir manutenção.', 'error');
    }
  };

  return {
    manutencoes: manutencoesOrdenadas,
    manutencoesOriginais,
    loading,
    error,
    filtros,
    searchTerm,
    metricas,
    refetch: fetchData,
    removerManutencao,
    controles: {
      searchTerm,
      filtros,
      sortConfig,
      handleSearchChange,
      handleFilterChange,
      requestSort,
    },
  };
};