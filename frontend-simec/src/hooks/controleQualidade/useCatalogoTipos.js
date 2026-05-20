import { useState, useEffect, useCallback } from 'react';
import { getTiposTeste, updateTipoTeste } from '@/services/api';

export function useCatalogoTipos() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [edits, setEdits] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTiposTeste({ somenteAtivos: false });
      setTipos(Array.isArray(data) ? data : []);
      setEdits({});
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const onChangeField = useCallback((id, campo, valor) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [campo]: valor },
    }));
  }, []);

  const salvar = useCallback(async (tipo) => {
    const dirty = edits[tipo.id];
    if (!dirty) return;
    setSalvandoId(tipo.id);
    try {
      await updateTipoTeste(tipo.id, dirty);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao salvar.');
    } finally {
      setSalvandoId(null);
    }
  }, [edits, carregar]);

  return {
    tipos,
    loading,
    error,
    edits,
    salvandoId,
    onChangeField,
    salvar,
  };
}
