import { useState, useEffect, useCallback } from 'react';
import { getUnidades } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';

const ESTADO_INICIAL = {
  tag: '',
  modelo: '',
  tipo: '',
  setor: '',
  unidadeId: '',
  fabricante: '',
  anoFabricacao: '',
  dataInstalacao: '',
  status: 'Operante',
  numeroPatrimonio: '',
  registroAnvisa: '',
  aeTitle: '',
  telefoneSuporte: '',
  observacoes: '',
};

export function useEquipamentoForm({ initialData, isEditing }) {
  const { addToast } = useToast();

  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [unidades, setUnidades] = useState([]);

  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [semPatrimonio, setSemPatrimonio] = useState(false);

  /**
   * =========================
   * LOAD UNIDADES
   * =========================
   */
  const fetchUnidades = useCallback(async () => {
    try {
      setLoadingUnidades(true);

      const data = await getUnidades();

      setUnidades(
        (Array.isArray(data) ? data : []).sort((a, b) =>
          String(a.nomeSistema || '').localeCompare(
            String(b.nomeSistema || '')
          )
        )
      );
    } catch (err) {
      addToast(
        getErrorMessage(err, 'Erro ao carregar unidades.'),
        'error'
      );
    } finally {
      setLoadingUnidades(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  /**
   * =========================
   * INITIAL DATA
   * =========================
   */
  useEffect(() => {
    if (isEditing && initialData) {
      const isSemPat =
        String(initialData.numeroPatrimonio || '').toLowerCase() ===
        'sem patrimônio';

      setSemPatrimonio(isSemPat);

      setFormData({
        ...ESTADO_INICIAL,
        ...initialData,
        unidadeId: initialData.unidade?.id || initialData.unidadeId || '',
        dataInstalacao: initialData.dataInstalacao
          ? String(initialData.dataInstalacao).split('T')[0]
          : '',
      });
    } else {
      setFormData(ESTADO_INICIAL);
      setSemPatrimonio(false);
    }
  }, [initialData, isEditing]);

  /**
   * =========================
   * HANDLERS
   * =========================
   */
  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (error) setError('');
  }, [error]);

  const toggleSemPatrimonio = useCallback((checked) => {
    setSemPatrimonio(checked);

    setFormData((prev) => ({
      ...prev,
      numeroPatrimonio: checked ? 'Sem Patrimônio' : '',
    }));
  }, []);

  /**
   * =========================
   * VALIDATION
   * =========================
   */
  const validate = useCallback(() => {
    if (
      !formData.tag ||
      !formData.modelo ||
      !formData.tipo ||
      !formData.unidadeId
    ) {
      return 'Tag, modelo, tipo e unidade são obrigatórios.';
    }

    if (
      formData.anoFabricacao &&
      !/^\d{4}$/.test(String(formData.anoFabricacao))
    ) {
      return 'Ano de fabricação inválido.';
    }

    return null;
  }, [formData]);

  return {
    formData,
    unidades,
    loadingUnidades,
    submitting,
    error,
    semPatrimonio,

    setSubmitting,
    setError,

    handleChange,
    toggleSemPatrimonio,
    validate,
  };
}
