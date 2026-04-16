import { useState, useMemo, useCallback, useEffect } from 'react';

const ESTADO_INICIAL = {
  unidadeId: '',
  equipamentoId: '',
  tipo: 'Preventiva',
  descricaoProblemaServico: '',
  agendamentoDataInicioLocal: '',
  agendamentoHoraInicioLocal: '',
  agendamentoDataFimLocal: '',
  agendamentoHoraFimLocal: '',
  tecnicoResponsavel: '',
  numeroChamado: '',
};

function montarDateTimeLocal(data, hora) {
  if (!data || !hora) return null;
  return `${data}T${hora}:00`;
}

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
      agendamentoDataInicioLocal:
        initialData.agendamentoDataInicioLocal ||
        initialData.agendamentoDataLocal ||
        '',
      agendamentoHoraInicioLocal:
        initialData.agendamentoHoraInicioLocal || '',
      agendamentoDataFimLocal:
        initialData.agendamentoDataFimLocal ||
        initialData.agendamentoDataLocal ||
        '',
      agendamentoHoraFimLocal:
        initialData.agendamentoHoraFimLocal ||
        initialData.agendamentoHoraFimLocal ||
        '',
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
    return (
      unidades.find(
        (unidade) => String(unidade.id) === String(formData.unidadeId)
      ) || null
    );
  }, [unidades, formData.unidadeId]);

  const isCorretiva = formData.tipo === 'Corretiva';

  const intervaloValido = useMemo(() => {
    const inicio = montarDateTimeLocal(
      formData.agendamentoDataInicioLocal,
      formData.agendamentoHoraInicioLocal
    );

    const fim = montarDateTimeLocal(
      formData.agendamentoDataFimLocal,
      formData.agendamentoHoraFimLocal
    );

    if (!inicio || !fim) return false;

    return new Date(fim).getTime() > new Date(inicio).getTime();
  }, [
    formData.agendamentoDataInicioLocal,
    formData.agendamentoHoraInicioLocal,
    formData.agendamentoDataFimLocal,
    formData.agendamentoHoraFimLocal,
  ]);

  const isValid = useMemo(() => {
    const descricaoValida = isCorretiva
      ? Boolean(formData.descricaoProblemaServico?.trim())
      : true;

    const chamadoValido = isCorretiva
      ? Boolean(formData.numeroChamado?.trim())
      : true;

    return Boolean(
      formData.unidadeId &&
        formData.equipamentoId &&
        formData.tipo &&
        formData.agendamentoDataInicioLocal &&
        formData.agendamentoHoraInicioLocal &&
        formData.agendamentoDataFimLocal &&
        formData.agendamentoHoraFimLocal &&
        descricaoValida &&
        chamadoValido &&
        intervaloValido
    );
  }, [formData, isCorretiva, intervaloValido]);

  return {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    unidadeSelecionada,
    isCorretiva,
    intervaloValido,
    isValid,
  };
}