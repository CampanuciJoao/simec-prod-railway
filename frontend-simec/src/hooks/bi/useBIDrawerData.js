import { useState, useEffect, useCallback } from 'react';

import { getEquipamentos } from '@/services/api/equipamentosApi';
import { getManutencoes } from '@/services/api/manutencoesApi';

const PAGE_SIZE = 10;
const LIVE_TYPES = new Set(['ativos', 'preventivas', 'corretivas', 'unidadeCritica']);

export function useBIDrawerData({ type, open, unidadeCriticaId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(
    async (pageNum, append) => {
      setLoading(true);
      try {
        let response;

        if (type === 'ativos') {
          response = await getEquipamentos({
            page: pageNum,
            pageSize: PAGE_SIZE,
            sortBy: 'modelo',
            sortDirection: 'asc',
          });
        } else if (type === 'preventivas') {
          response = await getManutencoes({
            tipo: 'Preventiva',
            page: pageNum,
            pageSize: PAGE_SIZE,
          });
        } else if (type === 'corretivas') {
          response = await getManutencoes({
            tipo: 'Corretiva',
            page: pageNum,
            pageSize: PAGE_SIZE,
          });
        } else if (type === 'unidadeCritica' && unidadeCriticaId) {
          response = await getManutencoes({
            unidadeId: unidadeCriticaId,
            tipo: 'Corretiva',
            status: 'Concluida',
            page: pageNum,
            pageSize: PAGE_SIZE,
          });
        }

        if (response) {
          const newItems = response.items ?? [];
          const total = response.total ?? newItems.length;
          setItems((prev) => (append ? [...prev, ...newItems] : newItems));
          setHasMore(pageNum * PAGE_SIZE < total);
        }
      } catch {
        // silent – drawer shows empty state on error
      } finally {
        setLoading(false);
      }
    },
    [type, unidadeCriticaId]
  );

  useEffect(() => {
    if (!open || !LIVE_TYPES.has(type)) {
      setItems([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    setItems([]);
    setPage(1);
    setHasMore(false);
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type, unidadeCriticaId]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [page, fetchPage]);

  return { items, loading, hasMore, loadMore };
}
