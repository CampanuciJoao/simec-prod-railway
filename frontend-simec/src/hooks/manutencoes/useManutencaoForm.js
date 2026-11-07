import { useState, useMemo, useCallback, useEffect } from 'react';

const ESTADO_INICIAL = {
  categoria: 'Equipamento',   // Equipamento | Predial
  unidadeId: '',
  equipamentoId: '',
  tipoServicoPredial: '',     // so quando categoria === 'Predial'
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

function validarHorario(valor = '') {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(valor).trim());
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

    const categoriaInicial = initialData.categoria || 'Equipamento';
    const unidadeIdInicial =
      initialData.unidadeId ||
      initialData.unidadePredialId ||
      initialData.equipamento?.unidadeId ||
      initialData.equipamento?.unidade?.id ||
      '';

    setFormData({
      categoria: categoriaInicial,
      unidadeId: unidadeIdInicial,
      equipamentoId: initialData.equipamentoId || '',
      tipoServicoPredial: initialData.tipoServicoPredial || '',
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

      // Trocar categoria limpa campos irrelevantes pra evitar envio sujo
      if (field === 'categoria') {
        return {
          ...prev,
          categoria: value,
          equipamentoId: '',
          tipoServicoPredial: '',
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
    if (
      !validarHorario(formData.agendamentoHoraInicioLocal) ||
      !validarHorario(formData.agendamentoHoraFimLocal)
    ) {
      return false;
    }

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

  const fieldErrors = useMemo(() => {
    const errors = {};

    if (
      formData.agendamentoHoraInicioLocal &&
      !validarHorario(formData.agendamentoHoraInicioLocal)
    ) {
      errors.agendamentoHoraInicioLocal = 'Informe a hora no formato HH:mm.';
    }

    if (
      formData.agendamentoHoraFimLocal &&
      !validarHorario(formData.agendamentoHoraFimLocal)
    ) {
      errors.agendamentoHoraFimLocal = 'Informe a hora no formato HH:mm.';
    }

    if (
      !errors.agendamentoHoraFimLocal &&
      formData.agendamentoDataInicioLocal &&
      formData.agendamentoHoraInicioLocal &&
      formData.agendamentoDataFimLocal &&
      formData.agendamentoHoraFimLocal &&
      !intervaloValido
    ) {
      errors.agendamentoHoraFimLocal =
        'A hora final precisa ser posterior ao início.';
    }

    return errors;
  }, [
    formData.agendamentoDataInicioLocal,
    formData.agendamentoHoraInicioLocal,
    formData.agendamentoDataFimLocal,
    formData.agendamentoHoraFimLocal,
    intervaloValido,
  ]);

  const isPredial = formData.categoria === 'Predial';

  const isValid = useMemo(() => {
    const descricaoValida = isCorretiva
      ? Boolean(formData.descricaoProblemaServico?.trim())
      : true;

    const chamadoValido = isCorretiva
      ? Boolean(formData.numeroChamado?.trim())
      : true;

    // Predial exige unidade + tipoServicoPredial; Equipamento exige equipamentoId
    const alvoValido = isPredial
      ? Boolean(formData.unidadeId && formData.tipoServicoPredial)
      : Boolean(formData.unidadeId && formData.equipamentoId);

    return Boolean(
      alvoValido &&
        formData.tipo &&
        formData.agendamentoDataInicioLocal &&
        formData.agendamentoHoraInicioLocal &&
        formData.agendamentoDataFimLocal &&
        formData.agendamentoHoraFimLocal &&
        descricaoValida &&
        chamadoValido &&
        intervaloValido
    );
  }, [formData, isCorretiva, isPredial, intervaloValido]);

  return {
    formData,
    handleChange,
    equipamentosFiltrados,
    unidades,
    unidadeSelecionada,
    isCorretiva,
    isPredial,
    intervaloValido,
    fieldErrors,
    isValid,
  };
}
