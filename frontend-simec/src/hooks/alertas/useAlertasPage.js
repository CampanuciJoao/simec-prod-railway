import { useMemo, useState } from 'react';
import { useAlertas } from '../../contexts/AlertasContext';

export function useAlertasPage() {
  const { alertas = [], loading, updateStatus, dismissAlerta } = useAlertas();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    tipo: '',
    status: 'NaoVisto',
    prioridade: '',
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  const alertasFiltrados = useMemo(() => {
    return alertas.filter((alerta) => {
      const termo = searchTerm.toLowerCase();

      const matchSearch =
        !termo ||
        alerta.titulo?.toLowerCase().includes(termo) ||
        alerta.subtitulo?.toLowerCase().includes(termo) ||
        alerta.tipo?.toLowerCase().includes(termo);

      const matchTipo = !filtros.tipo || alerta.tipo === filtros.tipo;
      const matchStatus = !filtros.status || alerta.status === filtros.status;
      const matchPrioridade =
        !filtros.prioridade || alerta.prioridade === filtros.prioridade;

      return matchSearch && matchTipo && matchStatus && matchPrioridade;
    });
  }, [alertas, searchTerm, filtros]);

  const tiposOptions = useMemo(() => {
    return [...new Set(alertas.map((a) => a.tipo).filter(Boolean))].map((tipo) => ({
      value: tipo,
      label: tipo,
    }));
  }, [alertas]);

  const prioridadesOptions = useMemo(() => {
    return [...new Set(alertas.map((a) => a.prioridade).filter(Boolean))].map(
      (prioridade) => ({
        value: prioridade,
        label: prioridade,
      })
    );
  }, [alertas]);

  const statusOptions = [
    { value: 'NaoVisto', label: 'Não visto' },
    { value: 'Visto', label: 'Visto' },
  ];

  const selectFiltersConfig = [
    {
      id: 'tipo',
      label: 'Tipo',
      value: filtros.tipo,
      onChange: (value) => handleFilterChange('tipo', value),
      options: tiposOptions,
      defaultLabel: 'Todos os tipos',
    },
    {
      id: 'status',
      label: 'Status',
      value: filtros.status,
      onChange: (value) => handleFilterChange('status', value),
      options: statusOptions,
      defaultLabel: 'Todos os status',
    },
    {
      id: 'prioridade',
      label: 'Prioridade',
      value: filtros.prioridade,
      onChange: (value) => handleFilterChange('prioridade', value),
      options: prioridadesOptions,
      defaultLabel: 'Todas as prioridades',
    },
  ];

  const metricas = useMemo(() => {
    const total = alertas.length;
    const naoVistos = alertas.filter((a) => a.status === 'NaoVisto').length;
    const vistos = alertas.filter((a) => a.status === 'Visto').length;
    const criticos = alertas.filter((a) => a.prioridade === 'Alta').length;

    return {
      total,
      naoVistos,
      vistos,
      criticos,
    };
  }, [alertas]);

  const activeFilters = useMemo(() => {
    return [
      searchTerm
        ? {
            key: 'searchTerm',
            label: `Busca: ${searchTerm}`,
            value: searchTerm,
          }
        : null,
      filtros.tipo
        ? {
            key: 'tipo',
            label: `Tipo: ${filtros.tipo}`,
            value: filtros.tipo,
          }
        : null,
      filtros.status
        ? {
            key: 'status',
            label:
              filtros.status === 'NaoVisto'
                ? 'Status: Não visto'
                : `Status: ${filtros.status}`,
            value: filtros.status,
          }
        : null,
      filtros.prioridade
        ? {
            key: 'prioridade',
            label: `Prioridade: ${filtros.prioridade}`,
            value: filtros.prioridade,
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
      tipo: '',
      status: '',
      prioridade: '',
    });
  };

  return {
    alertas,
    alertasFiltrados,
    loading,
    searchTerm,
    onSearchChange: handleSearchChange,
    filtros,
    selectFiltersConfig,
    metricas,
    activeFilters,
    clearFilter,
    clearAllFilters,
    updateStatus,
    dismissAlerta,
  };
}