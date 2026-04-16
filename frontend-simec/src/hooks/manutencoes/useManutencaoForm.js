import { useState, useMemo, useCallback, useEffect } from 'react';

const ESTADO_INICIAL = {
  unidadeId: '',
  equipamentoId: '',
  tipo: 'Preventiva',
  descricaoProblemaServico: '',
  agendamentoDataLocal: '',
  agendamentoHoraInicioLocal: '',
  agendamentoHoraFimLocal: '',
  tecnicoResponsavel: '',
  numeroChamado: '',
};

export function useManutencaoForm({
  initialData,
  equipamentos = [],
  unidades = [],
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL);

  useEffect(() => {
    if (!initialData) {
      setFormData(ESTADO_INICIAL);
      return;
    }

    const unidadeIdInicial =
      initialData.unidadeId ||
      initialData.equipamento?.unidadeId ||
      initialData.equipamento?.unidade?.id ||
      '';

    setFormData({
      unidadeId: unidadeIdInicial,
      equipamentoId: initialData.equipamentoId || '',
      tipo: initialData.tipo || 'Preventiva',
      descricaoProblemaServico: initialData.descricaoProblemaServico || '',
      agendamentoDataLocal: initialData.agendamentoDataLocal || '',
      agendamentoHoraInicioLocal: initialData.agendamentoHoraInicioLocal || '',
      agendamentoHoraFimLocal: initialData.agendamentoHoraFimLocal || '',
      tecnicoResponsavel: initialData.tecnicoResponsavel || '',
      numeroChamado: initialData.numeroChamado || '',
    });
  }, [initialData]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => {
      if (field === 'unidadeId') {
        return {
          ...prev,
          unidadeId: value,
          equipamentoId: '',
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  }, []);

  const equipamentosFiltrados = useMemo(() => {
    if (!formData.unidadeId) return [];

    return equipamentos.filter(
      (equipamento) => String(equipamento.unidadeId) === String(formData.unidadeId)
    );
  }, [equipamentos, formData.unidadeId]);

  const unidadeSelecionada = useMemo(() => {
    return unidades.find(
      (unidade) => String(unidade.id) === String(formData.unidadeId)
    ) || null;
  }, [unidades, formData.unidadeId]);

  const isCorretiva = formData.tipo === 'Corretiva';

  const isValid = useMemo(() => {
    return Boolean(
      formData.unidadeId &&
        formData.equipamentoId &&
        formData.tipo &&
        formData.descricaoProblemaServico?.trim() &&
        formData.agendamentoDataLocal &&
        formData.agendamentoHoraInicioLocal &&
        (!isCorretiva || formData.numeroChamado?.trim())
    );
  }, [formData, isCorretiva]);

  return {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    unidadeSelecionada,
    isCorretiva,
    isValid,
  };
}