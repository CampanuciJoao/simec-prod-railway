import { useCallback, useEffect, useState } from 'react';
import {
  obterResumoAuditoria,
  listarLicoesQuarentena,
  decidirSobreLicao,
  executarAuditoriaAgora,
} from '@/services/api/superadminLicaoAuditoriaApi';

export function useLicaoAuditoria() {
  const [resumo, setResumo] = useState(null);
  const [quarentena, setQuarentena] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, q] = await Promise.all([
        obterResumoAuditoria(),
        listarLicoesQuarentena({ pagina: 1, tamanhoPagina: 50 }),
      ]);
      setResumo(r);
      setQuarentena(q);
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const decidir = useCallback(
    async (licaoId, decisao) => {
      await decidirSobreLicao(licaoId, decisao);
      await carregar();
    },
    [carregar]
  );

  const rodarAgora = useCallback(async () => {
    setExecutando(true);
    try {
      const r = await executarAuditoriaAgora(500);
      await carregar();
      return r;
    } finally {
      setExecutando(false);
    }
  }, [carregar]);

  return {
    resumo,
    quarentena,
    loading,
    executando,
    error,
    recarregar: carregar,
    decidir,
    rodarAgora,
  };
}
