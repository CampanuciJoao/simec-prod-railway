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
        // Pre-preenche placa+modelo quando o seguro AUTO ja tem veiculo
        // vinculado, pra o usuario ver o que esta la sem precisar clicar
        // em "trocar veiculo".
        veiculoPlaca:  initialData.veiculo?.placa  || '',
        veiculoModelo: initialData.veiculo?.modelo || '',
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

    const tipoSeguro = formData.tipoSeguro || 'EQUIPAMENTO';
    const equipamentoId = formData.equipamentoId || null;
    const unidadeId = formData.unidadeId || null;
    const veiculoId = formData.veiculoId || null;
    const veiculoPlaca  = formData.veiculoPlaca?.trim()  || null;
    const veiculoModelo = formData.veiculoModelo?.trim() || null;

    // tipoAlvo derivado do escopo real: AUTO forca VEICULO mesmo se veiculoId
    // ainda nao existe (backend cria via upsert por placa).
    let tipoAlvo = 'EMPRESARIAL_GERAL';
    if (tipoSeguro === 'AUTO') tipoAlvo = 'VEICULO';
    else if (equipamentoId) tipoAlvo = 'EQUIPAMENTO';
    else if (veiculoId) tipoAlvo = 'VEICULO';
    else if (unidadeId) tipoAlvo = 'UNIDADE';

    return {
      apoliceNumero: formData.apoliceNumero || '',
      seguradora: formData.seguradora || '',
      dataInicio: formData.dataInicio || '',
      dataFim: formData.dataFim || '',
      premioTotal: Number(formData.premioTotal) || 0,
      status: formData.status || 'Ativo',
      tipoSeguro,
      tipoAlvo,
      equipamentoId,
      unidadeId,
      veiculoId,
      // AUTO: sempre envia placa+modelo (backend upsert). Outros tipos:
      // envia null pra evitar validador reclamar de placa parcial.
      veiculoPlaca:  tipoSeguro === 'AUTO' ? veiculoPlaca  : null,
      veiculoModelo: tipoSeguro === 'AUTO' ? veiculoModelo : null,
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