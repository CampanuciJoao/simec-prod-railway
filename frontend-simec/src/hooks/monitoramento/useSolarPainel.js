// Hook do painel Energia (/monitoramento > aba Energia). Suporta N plantas
// por tenant, cada planta com N inversores. Polling 30s pra manter vivo.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getSolarPlants,
  getSolarPlantStatus,
  getSolarPlantHistorico,
  getSolarPlantQuedas,
} from '@/services/api/solarApi';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';

const REFRESH_MS = 30_000;

export function useSolarPainel() {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [plants, setPlants] = useState([]);
  // Se a URL trouxer ?plantId=X (ex: deep-link vindo de um alerta),
  // inicializa com essa selecao em vez de esperar o fetch.
  const [plantSelecionadaId, setPlantSelecionadaId] = useState(
    () => searchParams.get('plantId') || null,
  );
  const [status, setStatus] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [quedas, setQuedas] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(true);
  const [loadingPainel, setLoadingPainel] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlants(true);
      try {
        const lista = await getSolarPlants();
        if (cancelled) return;
        const ativas = (lista || []).filter((p) => p.ativo);
        setPlants(ativas);
        if (ativas.length > 0) {
          // Se ja veio selecao da URL e ela e valida, mantem.
          // Senao, cai na primeira ativa.
          const atual = plantSelecionadaId;
          const idValido = atual && ativas.some((p) => p.id === atual);
          if (!idValido) setPlantSelecionadaId(ativas[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = getErrorMessage(err, 'Erro ao carregar plantas solares.');
        setErro(msg);
        addToast(msg, 'error');
      } finally {
        if (!cancelled) setLoadingPlants(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarPainel = useCallback(async (plantId) => {
    if (!plantId) return;
    setLoadingPainel(true);
    try {
      const hoje = new Date();
      const seteDias = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      const inicio = seteDias.toISOString().split('T')[0];
      const fim    = hoje.toISOString().split('T')[0];

      const [st, hist, qd] = await Promise.all([
        getSolarPlantStatus(plantId),
        getSolarPlantHistorico(plantId, { inicio, fim }),
        getSolarPlantQuedas(plantId, { limite: 50 }),
      ]);
      setStatus(st);
      setHistorico(hist);
      setQuedas(qd || []);
      setErro(null);
    } catch (err) {
      const msg = getErrorMessage(err, 'Erro ao carregar painel solar.');
      setErro(msg);
    } finally {
      setLoadingPainel(false);
    }
  }, []);

  useEffect(() => {
    if (!plantSelecionadaId) return undefined;
    carregarPainel(plantSelecionadaId);
    const interval = setInterval(() => carregarPainel(plantSelecionadaId), REFRESH_MS);
    return () => clearInterval(interval);
  }, [plantSelecionadaId, carregarPainel]);

  return {
    plants,
    plantSelecionadaId,
    setPlantSelecionadaId,
    status,
    historico,
    quedas,
    loadingPlants,
    loadingPainel,
    erro,
    refetch: () => carregarPainel(plantSelecionadaId),
  };
}
