import { useState, useEffect, useCallback } from 'react';
import {
  getSeguroById,
  addSeguro,
  updateSeguro,
  getEquipamentos,
  getUnidades,
  uploadAnexoSeguro,
  deleteAnexoSeguro,
} from '@/services/api';

export function useSalvarSeguroPage({ id, addToast, navigate }) {
  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [anexos, setAnexos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos({ page: 1, pageSize: 500, sortBy: 'modelo', sortDirection: 'asc' }),
        getUnidades(),
      ]);

      setEquipamentos(equipamentosData?.items || []);
      setUnidades(unidadesData || []);

      if (isEditing) {
        const data = await getSeguroById(id);
        setInitialData(data);
        setAnexos(data?.anexos || []);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Erro ao carregar dados.';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = useCallback(
    async (formData) => {
      try {
        if (isEditing) {
          await updateSeguro(id, formData);
          addToast('Seguro atualizado com sucesso!', 'success');
        } else {
          await addSeguro(formData);
          addToast('Seguro criado com sucesso!', 'success');
        }

        navigate('/seguros');
      } catch (err) {
        addToast('Erro ao salvar seguro.', 'error');
        throw err;
      }
    },
    [id, isEditing, addToast, navigate]
  );

  const handleUpload = async (file) => {
    if (!id || !file) return;

    const formData = new FormData();
    formData.append('file', file);

    await uploadAnexoSeguro(id, formData);
    await fetchData();
  };

  const handleDelete = async (anexoId) => {
    await deleteAnexoSeguro(id, anexoId);
    await fetchData();
  };

  return {
    isEditing,
    initialData,
    equipamentos,
    unidades,
    anexos,
    loading,
    error,
    handleSave,
    handleUpload,
    handleDelete,
  };
}
