import { useState, useCallback, useEffect } from 'react';
import { getOrcamentos, getOrcamentoMetricas } from '@/services/api/orcamentosApi';

export function useOrcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [metricas, setMetricas] = useState({
    total: 0,
    RASCUNHO: 0,
    PENDENTE: 0,
    APROVADO: 0,
    REJEITADO: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (filtroTipo) params.tipo = filtroTipo;

      const [lista, met] = await Promise.all([
        getOrcamentos(params),
        getOrcamentoMetricas(),
      ]);
      setOrcamentos(lista);
      setMetricas(met);
    } catch {
      setError('Erro ao carregar orçamentos.');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroTipo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const orcamentosFiltrados = orcamentos.filter((o) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      o.titulo?.toLowerCase().includes(q) ||
      o.fornecedores?.some((f) => f.nome?.toLowerCase().includes(q))
    );
  });

  return {
    orcamentos: orcamentosFiltrados,
    metricas,
    loading,
    error,
    filtroStatus,
    setFiltroStatus,
    filtroTipo,
    setFiltroTipo,
    busca,
    setBusca,
    carregar,
  };
}
