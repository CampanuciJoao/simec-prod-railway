import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useModal } from '../shared/useModal';
import { useManutencaoDetalhes } from './useManutencaoDetalhes';

function toDateInputValue(value) {
  if (!value) return '';

  try {
    const date = new Date(value);
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  } catch {
    return '';
  }
}

function toDateTimeLocalValue(value) {
  if (!value) return '';

  try {
    const date = new Date(value);
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

function montarFormDataInicial(manutencao) {
  if (!manutencao) {
    return {
      descricaoProblemaServico: '',
      tecnicoResponsavel: '',
      numeroChamado: '',
      status: '',
      dataHoraAgendamentoInicio: '',
      dataHoraAgendamentoFim: '',
      observacoes: '',
    };
  }

  return {
    descricaoProblemaServico: manutencao.descricaoProblemaServico || '',
    tecnicoResponsavel: manutencao.tecnicoResponsavel || '',
    numeroChamado: manutencao.numeroChamado || '',
    status: manutencao.status || '',
    dataHoraAgendamentoInicio: toDateTimeLocalValue(
      manutencao.dataHoraAgendamentoInicio
    ),
    dataHoraAgendamentoFim: toDateTimeLocalValue(manutencao.dataHoraAgendamentoFim),
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

  const [formData, setFormData] = useState(montarFormDataInicial(null));

  const [confirmMode, setConfirmMode] = useState('concluir');
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacaoDecisao, setObservacaoDecisao] = useState('');

  useEffect(() => {
    if (manutencao) {
      setFormData(montarFormDataInicial(manutencao));
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
      descricaoProblemaServico: formData.descricaoProblemaServico,
      tecnicoResponsavel: formData.tecnicoResponsavel,
      numeroChamado: formData.numeroChamado,
      observacoes: formData.observacoes,
    };

    if (formData.status) {
      payload.status = formData.status;
    }

    if (formData.dataHoraAgendamentoInicio) {
      payload.dataHoraAgendamentoInicio = new Date(
        formData.dataHoraAgendamentoInicio
      ).toISOString();
    }

    if (formData.dataHoraAgendamentoFim) {
      payload.dataHoraAgendamentoFim = new Date(
        formData.dataHoraAgendamentoFim
      ).toISOString();
    } else {
      payload.dataHoraAgendamentoFim = null;
    }

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
        status: 'EmAndamento',
        dataHoraAgendamentoFim: novaPrevisao
          ? new Date(novaPrevisao).toISOString()
          : null,
        observacoes: observacaoDecisao || manutencao?.observacoes || '',
      });

      await refetch();
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
    handleFormChange,
    handleSalvarAlteracoes,

    goBack,
    handlePrint,

    cancelModal,
    deleteAnexoModal,

    camposPrincipaisBloqueados,
    isCancelavel,

    handleAdicionarNota,
    handleUploadAnexos,
    handleAskDeleteAnexo,
    handleDeleteAnexo,
    handleCancelarManutencao,

    confirmMode,
    setConfirmMode,
    dataTerminoReal,
    setDataTerminoReal,
    novaPrevisao,
    setNovaPrevisao,
    observacaoDecisao,
    setObservacaoDecisao,
    handleConfirmacaoFinal,
  };
}