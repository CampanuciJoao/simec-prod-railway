import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContratoById } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export function useDetalhesContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchContrato = useCallback(async () => {
    if (!id) {
      setError('Contrato não informado.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await getContratoById(id);
      setContrato(data || null);
    } catch (err) {
      const mensagem =
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao carregar detalhes do contrato.';

      setError(mensagem);
      setContrato(null);
      addToast(mensagem, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchContrato();
  }, [fetchContrato]);

  return {
    contrato,
    loading,
    error,
    refetch: fetchContrato,
    goBack: () => navigate('/contratos'),
  };
}