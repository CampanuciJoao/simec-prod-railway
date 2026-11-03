// Hook do painel Energia da aba Monitoramento. Busca status atual +
// historico 7d + quedas recentes. Faz refresh automatico a cada 30s
// pra o painel ficar "vivo" (mas sem derrubar o backend — polling e
// cliente, snapshot real continua a cada 60s pelo cron).

import { useCallback, useEffect, useState } from 'react';
import {
  getFoxessSites,
  getFoxessSiteStatus,
  getFoxessHistorico,
  getFoxessQuedas,
} from '@/services/api/foxessApi';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';

const REFRESH_MS = 30_000;

export function useFoxessPainel() {
  const { addToast } = useToast();

  const [sites, setSites] = useState([]);
  const [siteSelecionadoId, setSiteSelecionadoId] = useState(null);
  const [status, setStatus] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [quedas, setQuedas] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingPainel, setLoadingPainel] = useState(false);
  const [erro, setErro] = useState(null);

  // Carrega lista de sites e seleciona o primeiro ativo automaticamente.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSites(true);
      try {
        const lista = await getFoxessSites();
        if (cancelled) return;
        const ativos = (lista || []).filter((s) => s.ativo);
        setSites(ativos);
        if (ativos.length > 0 && !siteSelecionadoId) {
          setSiteSelecionadoId(ativos[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = getErrorMessage(err, 'Erro ao carregar sites FoxESS.');
        setErro(msg);
        addToast(msg, 'error');
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarPainel = useCallback(async (siteId) => {
    if (!siteId) return;
    setLoadingPainel(true);
    try {
      // 3 chamadas em paralelo — status + 7 dias de historico + 50 quedas
      const hoje = new Date();
      const seteDias = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      const inicio = seteDias.toISOString().split('T')[0];
      const fim    = hoje.toISOString().split('T')[0];

      const [st, hist, qd] = await Promise.all([
        getFoxessSiteStatus(siteId),
        getFoxessHistorico(siteId, { inicio, fim }),
        getFoxessQuedas(siteId, { limite: 50 }),
      ]);
      setStatus(st);
      setHistorico(hist);
      setQuedas(qd || []);
      setErro(null);
    } catch (err) {
      const msg = getErrorMessage(err, 'Erro ao carregar painel FoxESS.');
      setErro(msg);
    } finally {
      setLoadingPainel(false);
    }
  }, []);

  // Reload inicial + polling 30s. Troca de site cancela o interval antigo.
  useEffect(() => {
    if (!siteSelecionadoId) return undefined;
    carregarPainel(siteSelecionadoId);
    const interval = setInterval(() => carregarPainel(siteSelecionadoId), REFRESH_MS);
    return () => clearInterval(interval);
  }, [siteSelecionadoId, carregarPainel]);

  return {
    sites,
    siteSelecionadoId,
    setSiteSelecionadoId,
    status,
    historico,
    quedas,
    loadingSites,
    loadingPainel,
    erro,
    refetch: () => carregarPainel(siteSelecionadoId),
  };
}
