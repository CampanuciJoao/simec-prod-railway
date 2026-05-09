import { useState, useEffect, useCallback } from 'react';
import {
  getSeguroById,
  renovarSeguro,
  getEquipamentos,
  getUnidades,
  uploadAnexoSeguro,
} from '@/services/api';

export function useRenovarSeguroPage({ id, addToast, navigate }) {
  const [seguroAnterior, setSeguroAnterior] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [seguroData, equipamentosData, unidadesData] = await Promise.all([
        getSeguroById(id),
        getEquipamentos({ page: 1, pageSize: 500, sortBy: 'modelo', sortDirection: 'asc' }),
        getUnidades(),
      ]);

      setSeguroAnterior(seguroData);
      setEquipamentos(equipamentosData?.items || []);
      setUnidades(unidadesData || []);
    } catch (err) {
      const message = err?.response?.data?.message || 'Erro ao carregar dados do seguro.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Constrói initialData pré-preenchido a partir do seguro anterior,
  // limpando campos que devem ser preenchidos manualmente na renovação.
  const initialData = seguroAnterior
    ? {
        ...seguroAnterior,
        id: undefined,
        apoliceNumero: '',
        dataInicio: '',
        dataFim: '',
        premioTotal: 0,
        status: 'Ativo',
        anexos: [],
      }
    : null;

  const handleRenovar = useCallback(
    async (formData, pendingFiles = []) => {
      try {
        const novoSeguro = await renovarSeguro(id, formData);

        if (pendingFiles.length > 0 && novoSeguro?.id) {
          for (const file of pendingFiles) {
            const fd = new FormData();
            fd.append('file', file);
            await uploadAnexoSeguro(novoSeguro.id, fd);
          }
        }

        addToast(
          `Apólice ${novoSeguro?.apoliceNumero || ''} criada com sucesso. Apólice anterior marcada como substituída.`,
          'success'
        );
        navigate(`/seguros/detalhes/${novoSeguro.id}`);
      } catch (err) {
        const message = err?.response?.data?.message || 'Erro ao renovar seguro.';
        addToast(message, 'error');
        throw err;
      }
    },
    [id, addToast, navigate]
  );

  return {
    seguroAnterior,
    initialData,
    equipamentos,
    unidades,
    loading,
    error,
    handleRenovar,
  };
}
