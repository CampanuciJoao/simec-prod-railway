import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { buscarEnderecoPorCep } from '@/services/api';

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

const CEP_IDLE_HINT =
  'Informe o CEP para preencher cidade, estado, bairro e logradouro automaticamente.';

function formatarCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) return digits;

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function useUnidadeForm({ initialData, isEditing }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [cepStatus, setCepStatus] = useState('idle');
  const [cepHint, setCepHint] = useState(CEP_IDLE_HINT);
  const lastLookupCepRef = useRef('');

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        ...INITIAL_STATE,
        ...initialData,
        cep: formatarCep(initialData.cep),
      });
      return;
    }

    if (!isEditing) {
      setFormData(INITIAL_STATE);
    }
  }, [initialData, isEditing]);

  const handleChange = useCallback((field, value) => {
    const nextValue = field === 'cep' ? formatarCep(value) : value;

    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    if (field === 'cep') {
      setCepStatus('idle');
      setCepHint(CEP_IDLE_HINT);

      const digits = nextValue.replace(/\D/g, '');
      if (digits.length < 8) {
        lastLookupCepRef.current = '';
      }
    }
  }, []);

  const cepDigits = useMemo(
    () => String(formData.cep || '').replace(/\D/g, ''),
    [formData.cep]
  );

  useEffect(() => {
    if (cepDigits.length !== 8) return;
    if (lastLookupCepRef.current === cepDigits) return;

    const controller = new AbortController();

    lastLookupCepRef.current = cepDigits;
    setCepStatus('loading');
    setCepHint('Buscando endereço pelo CEP...');

    buscarEnderecoPorCep(cepDigits, { signal: controller.signal })
      .then((endereco) => {
        setFormData((prev) => ({
          ...prev,
          cep: formatarCep(endereco.cep || prev.cep),
          logradouro: endereco.logradouro || prev.logradouro,
          bairro: endereco.bairro || prev.bairro,
          cidade: endereco.cidade || prev.cidade,
          estado: endereco.estado || prev.estado,
        }));
        setCepStatus('success');
        setCepHint(
          'Endereço sugerido pelo CEP. Complete apenas número e complemento, se necessário.'
        );
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        lastLookupCepRef.current = '';
        setCepStatus('error');
        setCepHint(error?.message || 'Não foi possível consultar o CEP.');
      });

    return () => controller.abort();
  }, [cepDigits]);

  const isValid = !!formData.nomeSistema && !!formData.nomeFantasia;

  return {
    formData,
    handleChange,
    cepStatus,
    cepHint,
    isValid,
  };
}
