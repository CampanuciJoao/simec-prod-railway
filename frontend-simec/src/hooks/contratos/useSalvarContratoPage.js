import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getContratoById,
  addContrato,
  updateContrato,
  getEquipamentos,
  getUnidades,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export function useSalvarContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!id;

  const [initialData, setInitialData] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades(),
      ]);

      setEquipamentos(equipamentosData || []);
      setUnidades(unidadesData || []);

      if (isEditing) {
        const contrato = await getContratoById(id);
        setInitialData(contrato);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao carregar dados do contrato.';

      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateContrato(id, formData);
        addToast('Contrato atualizado com sucesso!', 'success');
      } else {
        await addContrato(formData);
        addToast('Contrato criado com sucesso!', 'success');
      }

      navigate('/contratos', { state: { refresh: true } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao salvar contrato.';

      addToast(msg, 'error');
      throw err;
    }
  };

  return {
    isEditing,
    initialData,
    equipamentos,
    unidades,
    loading,
    error,
    handleSave,
    goBack: () => navigate('/contratos'),
  };
}