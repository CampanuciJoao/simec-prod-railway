import { useState, useEffect, useMemo, useCallback } from 'react';

import {
  getCoberturaFieldsByTipo,
  sanitizeCoberturasByTipo,
} from '@/utils/seguros';

export function useSeguroForm({
  initialData,
  isEditing,
  equipamentosDisponiveis,
}) {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData(initialData);
    }
  }, [isEditing, initialData]);

  const coberturaFields = useMemo(
    () => (formData.tipoSeguro ? getCoberturaFieldsByTipo(formData.tipoSeguro) : []),
    [formData.tipoSeguro]
  );

  const equipamentosFiltrados = useMemo(() => {
    if (!formData.unidadeId) return equipamentosDisponiveis;
    return equipamentosDisponiveis.filter(
      (e) => String(e.unidadeId) === String(formData.unidadeId)
    );
  }, [formData.unidadeId, equipamentosDisponiveis]);

  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  }, []);

  const buildPayload = () => {
    return sanitizeCoberturasByTipo(formData);
  };

  return {
    formData,
    setFormData,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
    coberturaFields,
    equipamentosFiltrados,
    handleChange,
    buildPayload,
  };
}