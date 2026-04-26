import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { exportarOSManutencaoPDF } from '../../services/api/pdfApi';
import { useModal } from '../shared/useModal';
import { useManutencaoDetalhes } from './useManutencaoDetalhes';

function toDateTimeLocalValue(value = new Date()) {
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    const hora = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${ano}-${mes}-${dia}T${hora}:${min}`;
  } catch {
    return '';
  }
}

function extrairFormInicial(manutencao) {
  if (!manutencao) {
    return {
      descricaoProblemaServico: '',
      tecnicoResponsavel: '',
      numeroChamado: '',
      agendamentoDataInicioLocal: '',
      agendamentoHoraInicioLocal: '',
      agendamentoDataFimLocal: '',
      agendamentoHoraFimLocal: '',
    };
  }

  return {
    descricaoProblemaServico: manutencao.descricaoProblemaServico || '',
    tecnicoResponsavel: manutencao.tecnicoResponsavel || '',
    numeroChamado: manutencao.numeroChamado || '',
    agendamentoDataInicioLocal:
      manutencao?.formulario?.agendamentoDataInicioLocal ||
      manutencao?.agendamentoLocal?.dataInicio ||
      manutencao?.agendamentoDataInicioLocal ||
      '',
    agendamentoHoraInicioLocal:
      manutencao?.formulario?.agendamentoHoraInicioLocal ||
      manutencao?.agendamentoLocal?.horaInicio ||
      manutencao?.agendamentoHoraInicioLocal ||
      '',
    agendamentoDataFimLocal:
      manutencao?.formulario?.agendamentoDataFimLocal ||
      manutencao?.agendamentoLocal?.dataFim ||
      manutencao?.agendamentoDataFimLocal ||
      '',
    agendamentoHoraFimLocal:
      manutencao?.formulario?.agendamentoHoraFimLocal ||
      manutencao?.agendamentoLocal?.horaFim ||
      manutencao?.agendamentoHoraFimLocal ||
      '',
  };
}

function parseDateTimeLocalToIso(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

export function useDetalhesManutencaoPage() {
  const { id, manutencaoId: manutencaoIdFromRoute } = useParams();
  const manutencaoId = id || manutencaoIdFromRoute;

  const navigate = useNavigate();

  const cancelModal = useModal();
  const deleteAnexoModal = useModal();

  const {
    manutencao,
    loading,
    error,
    submitting,
    salvarAtualizacoes,
    adicionarNota,
    fazerUploadAnexo,
    removerAnexo,
    concluirOS,
    refetch,
  } = useManutencaoDetalhes(manutencaoId);

  const [formData, setFormData] = useState(extrairFormInicial(null));
  const [confirmMode, setConfirmMode] = useState(null);
  const [manutencaoRealizada, setManutencaoRealizada] = useState(null);
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacaoDecisao, setObservacaoDecisao] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (manutencao) {
      setFormData(extrairFormInicial(manutencao));
    }
  }, [manutencao]);

  useEffect(() => {
    if (manutencao?.status === 'AguardandoConfirmacao') {
      setConfirmMode(null);
      setManutencaoRealizada(null);
      setDataTerminoReal(toDateTimeLocalValue(new Date()));
      setNovaPrevisao('');
      setObservacaoDecisao('');
    }
  }, [manutencao]);

  const camposPrincipaisBloqueados = useMemo(() => {
    const status = manutencao?.status || '';
    return ['Concluida', 'Cancelada'].includes(status);
  }, [manutencao]);

  const isCancelavel = useMemo(() => {
    const status = manutencao?.status || '';
    return ['Agendada', 'EmAndamento', 'AguardandoConfirmacao'].includes(status);
  }, [manutencao]);

  const canConfirmFinal = useMemo(() => {
    if (confirmMode === 'cancelar') {
      return Boolean(observacaoDecisao.trim());
    }

    if (confirmMode === 'concluir') {
      if (manutencaoRealizada === null || !dataTerminoReal) return false;
      if (!manutencaoRealizada && !observacaoDecisao.trim()) return false;
      return true;
    }

    if (confirmMode === 'prorrogar') {
      if (manutencaoRealizada === null || !novaPrevisao) return false;
      return Boolean(observacaoDecisao.trim());
    }

    return false;
  }, [
    confirmMode,
    dataTerminoReal,
    manutencaoRealizada,
    novaPrevisao,
    observacaoDecisao,
  ]);

  const goBack = () => {
    navigate('/manutencoes');
  };

  const handlePrint = () => {
    exportarOSManutencaoPDF(manutencaoId);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSalvarAlteracoes = async () => {
    const payload = {
      equipamentoId: manutencao?.equipamentoId,
      tipo: manutencao?.tipo,
      descricaoProblemaServico: formData.descricaoProblemaServico,
      tecnicoResponsavel: formData.tecnicoResponsavel,
      numeroChamado: formData.numeroChamado,
      agendamentoDataInicioLocal: formData.agendamentoDataInicioLocal,
      agendamentoHoraInicioLocal: formData.agendamentoHoraInicioLocal,
      agendamentoDataFimLocal: formData.agendamentoDataFimLocal,
      agendamentoHoraFimLocal: formData.agendamentoHoraFimLocal || null,
    };

    await salvarAtualizacoes(payload);
  };

  const handleAdicionarNota = async (texto) => {
    await adicionarNota(texto);
  };

  const handleUploadAnexos = async (formDataUpload) => {
    await fazerUploadAnexo(formDataUpload);
  };

  const handleAskDeleteAnexo = (anexoId) => {
    deleteAnexoModal.openModal({ anexoId });
  };

  const handleDeleteAnexo = async () => {
    const anexoId = deleteAnexoModal.modalData?.anexoId;
    if (!anexoId) return;

    await removerAnexo(anexoId);
    deleteAnexoModal.closeModal();
  };

  const handleCancelarManutencao = async () => {
    await concluirOS({
      acao: 'cancelar',
      observacao: cancelReason.trim(),
    });

    setCancelReason('');
    cancelModal.closeModal();
  };

  const handleSelectConfirmMode = (mode) => {
    setConfirmMode(mode);
    setObservacaoDecisao('');
    setManutencaoRealizada(null);

    if (mode === 'cancelar') {
      setCancelReason('');
      return;
    }

    setCancelReason('');
  };

  const handleAgendarVisita = async (form) => {
    const ok = await concluirOS({
      acao: 'agendar_visita',
      ...form,
    });
    return Boolean(ok);
  };

  const handleResolverInternamente = async (observacao) => {
    const ok = await concluirOS({
      acao: 'resolver_internamente',
      observacao,
    });
    return Boolean(ok);
  };

  const handleConfirmacaoFinal = async () => {
    if (confirmMode === 'concluir') {
      await concluirOS({
        acao: 'concluir',
        manutencaoRealizada,
        equipamentoOperante: true,
        dataTerminoReal: parseDateTimeLocalToIso(dataTerminoReal),
        observacao: observacaoDecisao.trim() || null,
      });
      return;
    }

    if (confirmMode === 'prorrogar') {
      await concluirOS({
        acao: 'prorrogar',
        manutencaoRealizada,
        equipamentoOperante: false,
        novaPrevisao: parseDateTimeLocalToIso(novaPrevisao),
        observacao: observacaoDecisao.trim() || null,
      });
      return;
    }

    if (confirmMode === 'cancelar') {
      await concluirOS({
        acao: 'cancelar',
        observacao: observacaoDecisao.trim(),
      });
    }
  };

  return {
    manutencao,
    loading,
    error,
    submitting,
    formData,
    setFormData,
    confirmMode,
    setConfirmMode: handleSelectConfirmMode,
    manutencaoRealizada,
    setManutencaoRealizada,
    dataTerminoReal,
    setDataTerminoReal,
    novaPrevisao,
    setNovaPrevisao,
    observacaoDecisao,
    setObservacaoDecisao,
    cancelReason,
    setCancelReason,
    canConfirmFinal,
    camposPrincipaisBloqueados,
    isCancelavel,
    goBack,
    handlePrint,
    handleFormChange,
    handleSalvarAlteracoes,
    handleAdicionarNota,
    handleUploadAnexos,
    handleAskDeleteAnexo,
    handleDeleteAnexo,
    handleCancelarManutencao,
    handleConfirmacaoFinal,
    handleAgendarVisita,
    handleResolverInternamente,
    cancelModal,
    deleteAnexoModal,
    refetch,
  };
}
