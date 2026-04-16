// src/hooks/manutencoes/useManutencaoForm.js

import { useState, useMemo, useCallback, useEffect } from 'react';

export function useManutencaoForm({
  initialData,
  equipamentos = [],
  unidades = [],
}) {
  const [formData, setFormData] = useState({
    equipamentoId: '',
    tipo: 'Preventiva',
    descricaoProblemaServico: '',
    agendamentoDataLocal: '',
    agendamentoHoraInicioLocal: '',
    agendamentoHoraFimLocal: '',
    tecnicoResponsavel: '',
    numeroChamado: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        equipamentoId: initialData.equipamentoId || '',
        tipo: initialData.tipo || 'Preventiva',
        descricaoProblemaServico: initialData.descricaoProblemaServico || '',
        agendamentoDataLocal: initialData.agendamentoDataLocal || '',
        agendamentoHoraInicioLocal: initialData.agendamentoHoraInicioLocal || '',
        agendamentoHoraFimLocal: initialData.agendamentoHoraFimLocal || '',
        tecnicoResponsavel: initialData.tecnicoResponsavel || '',
        numeroChamado: initialData.numeroChamado || '',
      });
    }
  }, [initialData]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const equipamentosFiltrados = useMemo(() => {
    if (!formData.unidadeId) return equipamentos;
    return equipamentos.filter((e) => e.unidadeId === formData.unidadeId);
  }, [equipamentos, formData.unidadeId]);

  const isCorretiva = formData.tipo === 'Corretiva';

  const isValid = useMemo(() => {
    return (
      formData.equipamentoId &&
      formData.tipo &&
      formData.agendamentoDataLocal &&
      formData.agendamentoHoraInicioLocal &&
      (!isCorretiva || formData.numeroChamado)
    );
  }, [formData, isCorretiva]);

  return {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    isCorretiva,
    isValid,
  };
}