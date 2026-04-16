import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteManutencao, getManutencoes } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatarCampoBusca(manutencao) {
  const partes = [
    manutencao?.numeroOS,
    manutencao?.descricaoProblemaServico,
    manutencao?.tipo,
    manutencao?.status,
    manutencao?.numeroChamado,
    manutencao?.equipamento?.modelo,
    manutencao?.equipamento?.tag,
    manutencao?.equipamento?.unidade?.nomeSistema,
    manutencao?.equipamento?.unidade?.nome,
    manutencao?.tecnicoResponsavel,
  ];

  return normalizarTexto(partes.filter(Boolean).join(' '));
}

function compareValues(a, b, direction = 'ascending') {
  const dir = direction === 'descending' ? -1 : 1;

  const valorA = a ?? '';
  const valorB = b ?? '';

  if (typeof valorA === 'number' && typeof valorB === 'number') {
    return valorA > valorB ? dir : valorA < valorB ? -dir : 0;
  }

  const dataA =
    valorA instanceof Date
      ? valorA.getTime()
      : typeof valorA === 'string' && !Number.isNaN(Date.parse(valorA))
        ? new Date(valorA).getTime()
        : null;

  const dataB =
    valorB instanceof Date
      ? valorB.getTime()
      : typeof valorB === 'string' && !Number.isNaN(Date.parse(valorB))
        ? new Date(valorB).getTime()
        : null;

  if (dataA !== null && dataB !== null) {
    return dataA > dataB ? dir : dataA < dataB ? -dir : 0;
  }

  const textoA = normalizarTexto(valorA);
  const textoB = normalizarTexto(valorB);

  return textoA > textoB ? dir : textoA < textoB ? -dir : 0;
}

function getSortValue(item, key) {
  switch (key) {
    case 'numeroOS':
      return item?.numeroOS;
    case 'tipo':
      return item?.tipo;
    case 'status':
      return item?.status;
    case 'numeroChamado':
      return item?.numeroChamado;
    case 'descricaoProblemaServico':
      return item?.descricaoProblemaServico;
    case 'equipamento':
      return item?.equipamento?.modelo;
    case 'tag':
      return item?.equipamento?.tag;
    case 'unidade':
      return item?.equipamento?.unidade?.nomeSistema || item?.equipamento?.unidade?.nome;
    case 'dataHoraAgendamentoInicio':
      return item?.dataHoraAgendamentoInicio;
    case 'dataHoraAgendamentoFim':
      return item?.dataHoraAgendamentoFim;
    case 'tecnicoResponsavel':
      return item?.tecnicoResponsavel;
    default:
      return item?.[key];
  }
}

function calcularMetricas(lista = []) {
  const metricas = {
    total: lista.length,
    emAndamento: 0,
    aguardando: 0,
    concluidas: 0,
    canceladas: 0,
  };

  for (const item of lista) {
    const status = String(item?.status || '');

    if (status === 'EmAndamento') metricas.emAndamento += 1;
    if (status === 'AguardandoConfirmacao') metricas.aguardando += 1;
    if (status === 'Concluida') metricas.concluidas += 1;
    if (status === 'Cancelada') metricas.canceladas += 1;
  }

  return metricas;
}

export function useManutencoes() {
  const { addToast } = useToast();

  const [manutencoesOriginais, setManutencoesOriginais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const fetchManutencoes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getManutencoes();
      setManutencoesOriginais(Array.isArray(data) ? data : []);
    } catch (err) {
      const mensagem =
        err?.response?.data?.message || 'Não foi possível carregar as manutenções.';
      setError(mensagem);
      addToast(mensagem, 'error');
      setManutencoesOriginais([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchManutencoes();
  }, [fetchManutencoes]);

  const manutencoesFiltradas = useMemo(() => {
    const termoBusca = normalizarTexto(searchTerm);

    return manutencoesOriginais.filter((manutencao) => {
      if (filtros.status && manutencao?.status !== filtros.status) {
        return false;
      }

      if (filtros.tipo && manutencao?.tipo !== filtros.tipo) {
        return false;
      }

      if (filtros.unidade) {
        const unidade =
          manutencao?.equipamento?.unidade?.nomeSistema ||
          manutencao?.equipamento?.unidade?.nome ||
          '';

        if (unidade !== filtros.unidade) {
          return false;
        }
      }

      if (termoBusca) {
        const campoBusca = formatarCampoBusca(manutencao);
        if (!campoBusca.includes(termoBusca)) {
          return false;
        }
      }

      return true;
    });
  }, [manutencoesOriginais, filtros, searchTerm]);

  const manutencoes = useMemo(() => {
    const lista = [...manutencoesFiltradas];

    if (!sortConfig?.key) {
      return lista;
    }

    return lista.sort((a, b) => {
      const valorA = getSortValue(a, sortConfig.key);
      const valorB = getSortValue(b, sortConfig.key);

      return compareValues(valorA, valorB, sortConfig.direction);
    });
  }, [manutencoesFiltradas, sortConfig]);

  const metricas = useMemo(() => calcularMetricas(manutencoesFiltradas), [manutencoesFiltradas]);

  const handleSearchChange = useCallback((eventOrValue) => {
    const value =
      typeof eventOrValue === 'string'
        ? eventOrValue
        : eventOrValue?.target?.value || '';

    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }, []);

  const requestSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }

      return {
        key,
        direction: 'ascending',
      };
    });
  }, []);

  const removerManutencao = useCallback(
    async (id) => {
      if (!id) return;

      try {
        await deleteManutencao(id);

        setManutencoesOriginais((prev) => prev.filter((item) => item.id !== id));
        addToast('Ordem de serviço excluída com sucesso.', 'success');
      } catch (err) {
        const mensagem =
          err?.response?.data?.message || 'Erro ao excluir a ordem de serviço.';
        addToast(mensagem, 'error');
        throw err;
      }
    },
    [addToast]
  );

  const controles = useMemo(
    () => ({
      handleSearchChange,
      handleFilterChange,
      sortConfig,
      requestSort,
    }),
    [handleSearchChange, handleFilterChange, sortConfig, requestSort]
  );

  return {
    manutencoes,
    manutencoesOriginais,
    loading,
    error,
    searchTerm,
    filtros,
    metricas,
    removerManutencao,
    refetch: fetchManutencoes,
    controles,
  };
}