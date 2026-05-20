import { useCallback, useEffect, useState } from 'react';
import {
  listarUsuariosCrossTenant,
  listarTenantsParaFiltro,
  resetarSenhaUsuario,
} from '@/services/api/superadminUsuariosApi';

export function useUsuariosCrossTenant() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filtros, setFiltros] = useState({ search: '', tenantId: '', role: '' });
  const [resetandoId, setResetandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarUsuariosCrossTenant({
        search: filtros.search || undefined,
        tenantId: filtros.tenantId || undefined,
        role: filtros.role || undefined,
        page,
        pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (e) {
      setError(
        e?.response?.data?.message || 'Erro ao carregar usuários cross-tenant.'
      );
    } finally {
      setLoading(false);
    }
  }, [filtros, page, pageSize]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Tenants pra dropdown — só carrega uma vez
  useEffect(() => {
    listarTenantsParaFiltro()
      .then(setTenants)
      .catch(() => setTenants([]));
  }, []);

  const setFiltro = useCallback((campo, valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPage(1);
  }, []);

  const resetarSenha = useCallback(async (usuarioId) => {
    setResetandoId(usuarioId);
    try {
      return await resetarSenhaUsuario(usuarioId);
    } finally {
      setResetandoId(null);
    }
  }, []);

  return {
    items,
    total,
    tenants,
    loading,
    error,
    page,
    pageSize,
    filtros,
    setFiltro,
    setPage,
    resetarSenha,
    resetandoId,
    recarregar: carregar,
  };
}
