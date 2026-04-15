import { useState, useEffect, useCallback } from 'react';

const INITIAL_STATE = {
  nomeSistema: '',
  nomeFantasia: '',
  cnpj: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
};

export function useUnidadeForm({ initialData, isEditing }) {
  const [formData, setFormData] = useState(INITIAL_STATE);

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        ...INITIAL_STATE,
        ...initialData,
      });
    }
  }, [initialData, isEditing]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const isValid = !!formData.nomeSistema && !!formData.nomeFantasia;

  return {
    formData,
    handleChange,
    isValid,
  };
}