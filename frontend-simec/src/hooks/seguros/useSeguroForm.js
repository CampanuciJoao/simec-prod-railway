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
      setFormData({
        ...initialData,
        dataInicio: initialData.dataInicio
          ? initialData.dataInicio.slice(0, 10)
          : '',
        dataFim: initialData.dataFim
          ? initialData.dataFim.slice(0, 10)
          : '',
      });
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
    const lmiFields = sanitizeCoberturasByTipo(formData);

    const equipamentoId = formData.equipamentoId || null;
    const unidadeId = formData.unidadeId || null;
    const veiculoId = formData.veiculoId || null;

    let tipoAlvo = 'EMPRESARIAL_GERAL';
    if (equipamentoId) tipoAlvo = 'EQUIPAMENTO';
    else if (veiculoId) tipoAlvo = 'VEICULO';
    else if (unidadeId) tipoAlvo = 'UNIDADE';

    return {
      apoliceNumero: formData.apoliceNumero || '',
      seguradora: formData.seguradora || '',
      dataInicio: formData.dataInicio || '',
      dataFim: formData.dataFim || '',
      premioTotal: Number(formData.premioTotal) || 0,
      status: formData.status || 'Ativo',
      tipoSeguro: formData.tipoSeguro || 'EQUIPAMENTO',
      tipoAlvo,
      equipamentoId,
      unidadeId,
      veiculoId,
      cobertura: formData.cobertura || null,
      lmiIncendio: lmiFields.lmiIncendio,
      lmiDanosEletricos: lmiFields.lmiDanosEletricos,
      lmiRoubo: lmiFields.lmiRoubo,
      lmiVidros: lmiFields.lmiVidros,
      lmiColisao: lmiFields.lmiColisao,
      lmiVendaval: lmiFields.lmiVendaval,
      lmiDanosCausaExterna: lmiFields.lmiDanosCausaExterna,
      lmiPerdaLucroBruto: lmiFields.lmiPerdaLucroBruto,
      lmiVazamentoTanques: lmiFields.lmiVazamentoTanques,
      lmiResponsabilidadeCivil: lmiFields.lmiResponsabilidadeCivil,
      lmiDanosMateriais: lmiFields.lmiDanosMateriais,
      lmiDanosCorporais: lmiFields.lmiDanosCorporais,
      lmiDanosMorais: lmiFields.lmiDanosMorais,
      lmiAPP: lmiFields.lmiAPP,
    };
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