import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useModal } from '../shared/useModal';
import { useManutencaoDetalhes } from './useManutencaoDetalhes';

function toDateInputValue(value) {
  if (!value) return '';

  try {
    const date = value instanceof Date ? value : new Date(value);
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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
      status: '',
      agendamentoDataLocal: '',
      agendamentoHoraInicioLocal: '',
      agendamentoHoraFimLocal: '',
      observacoes: '',
    };
  }

  return {
    descricaoProblemaServico: manutencao.descricaoProblemaServico || '',
    tecnicoResponsavel: manutencao.tecnicoResponsavel || '',
    numeroChamado: manutencao.numeroChamado || '',
    status: manutencao.status || '',
    agendamentoDataLocal:
      manutencao?.formulario?.agendamentoDataLocal ||
      manutencao?.agendamentoLocal?.data ||
      manutencao?.agendamentoDataLocal ||
      '',
    agendamentoHoraInicioLocal:
      manutencao?.formulario?.agendamentoHoraInicioLocal ||
      manutencao?.agendamentoLocal?.horaInicio ||
      manutencao?.agendamentoHoraInicioLocal ||
      '',
    agendamentoHoraFimLocal:
      manutencao?.formulario?.agendamentoHoraFimLocal ||
      manutencao?.agendamentoLocal?.horaFim ||
      manutencao?.agendamentoHoraFimLocal ||
      '',
    observacoes: manutencao.observacoes || '',
  };
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
    cancelarOS,
    concluirOS,
    refetch,
  } = useManutencaoDetalhes(manutencaoId);

  const [formData, setFormData] = useState(extrairFormInicial(null));

  const [confirmMode, setConfirmMode] = useState('concluir');
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacaoDecisao, setObservacaoDecisao] = useState('');

  useEffect(() => {
    if (manutencao) {
      setFormData(extrairFormInicial(manutencao));
    }
  }, [manutencao]);

  useEffect(() => {
    if (manutencao?.status === 'AguardandoConfirmacao') {
      setConfirmMode('concluir');
      setDataTerminoReal(toDateInputValue(new Date()));
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

  const goBack = () => {
    navigate('/manutencoes');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

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
      status: formData.status || manutencao?.status || 'Agendada',
      agendamentoDataLocal: formData.agendamentoDataLocal,
      agendamentoHoraInicioLocal: formData.agendamentoHoraInicioLocal,
      agendamentoHoraFimLocal: formData.agendamentoHoraFimLocal || null,
      observacoes: formData.observacoes,
    };

    await salvarAtualizacoes(payload);
    await refetch();
  };

  const handleAdicionarNota = async (texto) => {
    await adicionarNota(texto);
    await refetch();
  };

  const handleUploadAnexos = async (formDataUpload) => {
    await fazerUploadAnexo(formDataUpload);
    await refetch();
  };

  const handleAskDeleteAnexo = (anexoId) => {
    deleteAnexoModal.openModal({ anexoId });
  };

  const handleDeleteAnexo = async () => {
    const anexoId = deleteAnexoModal.modalData?.anexoId;
    if (!anexoId) return;

    await removerAnexo(anexoId);
    deleteAnexoModal.closeModal();
    await refetch();
  };

  const handleCancelarManutencao = async (motivo = '') => {
    const ok = await cancelarOS(motivo);
    if (ok) {
      cancelModal.closeModal();
      await refetch();
    }
  };

  const handleConfirmacaoFinal = async () => {
    if (confirmMode === 'concluir') {
      await concluirOS({
        acao: 'concluir',
        dataTerminoReal: dataTerminoReal
          ? new Date(`${dataTerminoReal}T00:00:00`).toISOString()
          : new Date().toISOString(),
        observacao: observacaoDecisao || null,
      });

      await refetch();
      return;
    }

    if (confirmMode === 'prorrogar') {
      await salvarAtualizacoes({
        equipamentoId: manutencao?.equipamentoId,
        tipo: manutencao?.tipo,
        descricaoProblemaServico:
          formData.descricaoProblemaServico || manutencao?.descricaoProblemaServico || '',
        tecnicoResponsavel:
          formData.tecnicoResponsavel || manutencao?.tecnicoResponsavel || '',
        numeroChamado: formData.numeroChamado || manutencao?.numeroChamado || '',
        status: 'EmAndamento',
        agendamentoDataLocal:
          formData.agendamentoDataLocal || manutencao?.agendamentoLocal?.data || '',
        agendamentoHoraInicioLocal:
          formData.agendamentoHoraInicioLocal ||
          manutencao?.agendamentoLocal?.horaInicio ||
          '',
        agendamentoHoraFimLocal: formData.agendamentoHoraFimLocal || null,
        observacoes: observacaoDecisao || manutencao?.observacoes || '',
      });

      await refetch();
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
    setConfirmMode,
    dataTerminoReal,
    setDataTerminoReal,
    novaPrevisao,
    setNovaPrevisao,
    observacaoDecisao,
    setObservacaoDecisao,
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
    cancelModal,
    deleteAnexoModal,
    refetch,
  };
}