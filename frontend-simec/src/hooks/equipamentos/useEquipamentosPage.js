import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { getEquipamentos } from '../../services/api';
import { getErrorMessage } from '../../utils/errorUtils';

export function useEquipamentosPage() {
  const { addToast } = useToast();

  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarEquipamentos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getEquipamentos();
      setEquipamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = getErrorMessage(
        err,
        'Erro ao carregar equipamentos.'
      );

      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    carregarEquipamentos();
  }, [carregarEquipamentos]);

  /**
   * Atualiza 1 equipamento localmente (evita reload total)
   */
  const atualizarEquipamentoLocal = useCallback((equipAtualizado) => {
    setEquipamentos((prev) =>
      prev.map((eq) =>
        eq.id === equipAtualizado.id ? equipAtualizado : eq
      )
    );
  }, []);

  /**
   * Remove equipamento localmente
   */
  const removerEquipamentoLocal = useCallback((id) => {
    setEquipamentos((prev) =>
      prev.filter((eq) => eq.id !== id)
    );
  }, []);

  return {
    equipamentos,
    loading,
    error,
    refetch: carregarEquipamentos,
    atualizarEquipamentoLocal,
    removerEquipamentoLocal,
  };
}