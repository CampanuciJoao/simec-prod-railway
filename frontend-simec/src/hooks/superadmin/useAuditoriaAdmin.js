import { useCallback, useEffect, useState } from 'react';
import {
  listarLogAdmin,
  listarImpersonacoes,
} from '@/services/api/superadminAuditoriaApi';

const PAGE_SIZE = 25;

export function useAuditoriaAdmin() {
  const [aba, setAba] = useState('admin'); // 'admin' | 'impersonacoes'

  // LOGS ADMIN
  const [logs, setLogs] = useState({ items: [], total: 0 });
  const [logsPage, setLogsPage] = useState(1);
  const [logsFiltros, setLogsFiltros] = useState({ acao: '', alvoTipo: '' });
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);

  // IMPERSONACOES
  const [imp, setImp] = useState({ items: [], total: 0 });
  const [impPage, setImpPage] = useState(1);
  const [impFiltros, setImpFiltros] = useState({ status: '' });
  const [impLoading, setImpLoading] = useState(true);
  const [impError, setImpError] = useState(null);

  const carregarLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await listarLogAdmin({
        acao: logsFiltros.acao || undefined,
        alvoTipo: logsFiltros.alvoTipo || undefined,
        page: logsPage,
        pageSize: PAGE_SIZE,
      });
      setLogs({ items: data.items || [], total: data.total || 0 });
      setLogsError(null);
    } catch (e) {
      setLogsError(e?.response?.data?.message || 'Erro ao carregar log administrativo.');
    } finally {
      setLogsLoading(false);
    }
  }, [logsFiltros, logsPage]);

  const carregarImp = useCallback(async () => {
    setImpLoading(true);
    try {
      const data = await listarImpersonacoes({
        status: impFiltros.status || undefined,
        page: impPage,
        pageSize: PAGE_SIZE,
      });
      setImp({ items: data.items || [], total: data.total || 0 });
      setImpError(null);
    } catch (e) {
      setImpError(
        e?.response?.data?.message || 'Erro ao carregar histórico de impersonação.'
      );
    } finally {
      setImpLoading(false);
    }
  }, [impFiltros, impPage]);

  useEffect(() => {
    if (aba === 'admin') carregarLogs();
  }, [aba, carregarLogs]);

  useEffect(() => {
    if (aba === 'impersonacoes') carregarImp();
  }, [aba, carregarImp]);

  return {
    aba,
    setAba,
    pageSize: PAGE_SIZE,
    // Logs admin
    logs,
    logsPage,
    setLogsPage,
    logsFiltros,
    setLogsFiltros: (next) => {
      setLogsFiltros(next);
      setLogsPage(1);
    },
    logsLoading,
    logsError,
    recarregarLogs: carregarLogs,
    // Impersonações
    imp,
    impPage,
    setImpPage,
    impFiltros,
    setImpFiltros: (next) => {
      setImpFiltros(next);
      setImpPage(1);
    },
    impLoading,
    impError,
    recarregarImp: carregarImp,
  };
}
