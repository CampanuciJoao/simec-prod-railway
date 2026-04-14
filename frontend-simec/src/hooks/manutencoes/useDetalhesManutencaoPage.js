import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useModal } from '../shared/useModal';
import { useManutencaoDetalhes } from './useManutencaoDetalhes';

function toDateTimeLocalValue(value) {
  if (!value) return '';

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
      status: '',
      agendamentoDataLocal: '',
      agendamentoHoraInicioLocal: '',
      agendamentoHoraFimLocal: '',
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
  };
}

function parseDateTimeLocalToIso(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
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

  const [confirmMode, setConfirmMode] = useState(null);
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
      setConfirmMode(null);
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

  const handleCancelarManutencao = async (motivo = '') => {
    const ok = await cancelarOS(motivo);
    if (ok) {
      cancelModal.closeModal();
    }
  };

  const handleConfirmacaoFinal = async () => {
    if (confirmMode === 'concluir') {
      await concluirOS({
        acao: 'concluir',
        dataTerminoReal:
          parseDateTimeLocalToIso(dataTerminoReal) || new Date().toISOString(),
        observacao: observacaoDecisao || null,
      });
      return;
    }

    if (confirmMode === 'prorrogar') {
      await concluirOS({
        acao: 'prorrogar',
        novaPrevisao: parseDateTimeLocalToIso(novaPrevisao),
        observacao: observacaoDecisao || null,
      });
      return;
    }

    if (confirmMode === 'cancelar') {
      await handleCancelarManutencao(
        observacaoDecisao || 'Cancelada na etapa de confirmação final.'
      );
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