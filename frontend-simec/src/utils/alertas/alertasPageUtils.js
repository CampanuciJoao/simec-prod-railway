export function normalizarArrayAlertas(data) {
  return Array.isArray(data) ? data : [];
}

export function calcularMetricasAlertas(alertas = []) {
  return {
    total: alertas.length,
    naoVistos: alertas.filter((a) => a.status === 'NaoVisto').length,
    vistos: alertas.filter((a) => a.status === 'Visto').length,
    criticos: alertas.filter((a) => a.prioridade === 'Alta').length,
  };
}

export function buildSelectFiltersConfig(filtros, setFiltros) {
  return [
    {
      id: 'status',
      label: 'Status',
      value: filtros.status,
      options: [
        { label: 'Não visto', value: 'NaoVisto' },
        { label: 'Visto', value: 'Visto' },
      ],
      onChange: (value) =>
        setFiltros((prev) => ({ ...prev, status: value })),
    },
    {
      id: 'tipo',
      label: 'Tipo',
      value: filtros.tipo,
      options: [
        { label: 'Alerta', value: 'Alerta' },
        { label: 'Recomendação', value: 'Recomendação' },
      ],
      onChange: (value) =>
        setFiltros((prev) => ({ ...prev, tipo: value })),
    },
    {
      id: 'prioridade',
      label: 'Prioridade',
      value: filtros.prioridade,
      options: [
        { label: 'Alta', value: 'Alta' },
        { label: 'Média', value: 'Media' },
        { label: 'Baixa', value: 'Baixa' },
      ],
      onChange: (value) =>
        setFiltros((prev) => ({ ...prev, prioridade: value })),
    },
  ];
}

export function filtrarAlertas(alertas = [], searchTerm = '', filtros = {}) {
  let items = [...alertas];

  if (searchTerm) {
    const termo = searchTerm.toLowerCase();

    items = items.filter(
      (a) =>
        a.titulo?.toLowerCase().includes(termo) ||
        a.subtitulo?.toLowerCase().includes(termo)
    );
  }

  if (filtros.status) {
    items = items.filter((a) => a.status === filtros.status);
  }

  if (filtros.tipo) {
    items = items.filter((a) => a.tipo === filtros.tipo);
  }

  if (filtros.prioridade) {
    items = items.filter((a) => a.prioridade === filtros.prioridade);
  }

  return items;
}

export function buildActiveFiltersAlertas(filtros = {}) {
  const result = [];

  if (filtros.status) {
    result.push({
      key: 'status',
      label: `Status: ${filtros.status}`,
    });
  }

  if (filtros.tipo) {
    result.push({
      key: 'tipo',
      label: `Tipo: ${filtros.tipo}`,
    });
  }

  if (filtros.prioridade) {
    result.push({
      key: 'prioridade',
      label: `Prioridade: ${filtros.prioridade}`,
    });
  }

  return result;
}