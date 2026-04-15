import { useEffect, useMemo, useState, useCallback } from 'react';

const ESTADO_INICIAL_VAZIO = {
  numeroContrato: '',
  categoria: '',
  fornecedor: '',
  dataInicio: '',
  dataFim: '',
  status: 'Ativo',
  unidadesCobertasIds: [],
  equipamentosCobertosIds: [],
};

export function useContratoForm({
  initialData = null,
  isEditing = false,
  todosEquipamentos = [],
  onSubmit,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        numeroContrato: initialData.numeroContrato || '',
        categoria: initialData.categoria || '',
        fornecedor: initialData.fornecedor || '',
        dataInicio: initialData.dataInicio?.split('T')[0] || '',
        dataFim: initialData.dataFim?.split('T')[0] || '',
        status: initialData.status || 'Ativo',
        unidadesCobertasIds:
          initialData.unidadesCobertas?.map((u) => u.id) || [],
        equipamentosCobertosIds:
          initialData.equipamentosCobertos?.map((e) => e.id) || [],
      });
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
    }
  }, [isEditing, initialData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError('');
  }, []);

  const handleToggleUnidade = useCallback((id) => {
    setFormData((prev) => {
      const exists = prev.unidadesCobertasIds.includes(id);

      const unidadesCobertasIds = exists
        ? prev.unidadesCobertasIds.filter((itemId) => itemId !== id)
        : [...prev.unidadesCobertasIds, id];

      let equipamentosCobertosIds = prev.equipamentosCobertosIds;

      if (exists) {
        const equipamentosDaUnidade = todosEquipamentos
          .filter((equipamento) => equipamento.unidadeId === id)
          .map((equipamento) => equipamento.id);

        equipamentosCobertosIds = prev.equipamentosCobertosIds.filter(
          (equipamentoId) => !equipamentosDaUnidade.includes(equipamentoId)
        );
      }

      return {
        ...prev,
        unidadesCobertasIds,
        equipamentosCobertosIds,
      };
    });

    setError('');
  }, [todosEquipamentos]);

  const handleToggleEquipamento = useCallback((id) => {
    setFormData((prev) => {
      const exists = prev.equipamentosCobertosIds.includes(id);

      return {
        ...prev,
        equipamentosCobertosIds: exists
          ? prev.equipamentosCobertosIds.filter((itemId) => itemId !== id)
          : [...prev.equipamentosCobertosIds, id],
      };
    });

    setError('');
  }, []);

  const equipamentosFiltrados = useMemo(() => {
    if (formData.unidadesCobertasIds.length === 0) return [];

    return todosEquipamentos.filter((equipamento) =>
      formData.unidadesCobertasIds.includes(equipamento.unidadeId)
    );
  }, [formData.unidadesCobertasIds, todosEquipamentos]);

  const validate = useCallback(() => {
    if (
      !formData.numeroContrato.trim() ||
      !formData.categoria ||
      !formData.fornecedor.trim() ||
      !formData.dataInicio ||
      !formData.dataFim
    ) {
      return 'Número do contrato, categoria, fornecedor, data de início e data de fim são obrigatórios.';
    }

    if (formData.dataFim < formData.dataInicio) {
      return 'A data de fim não pode ser menor que a data de início.';
    }

    return '';
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        numeroContrato: formData.numeroContrato.trim(),
        fornecedor: formData.fornecedor.trim(),
      });

      return true;
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          'Ocorreu um erro ao salvar o contrato.'
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, validate]);

  return {
    formData,
    error,
    isSubmitting,
    equipamentosFiltrados,
    handleChange,
    handleToggleUnidade,
    handleToggleEquipamento,
    handleSubmit,
  };
}