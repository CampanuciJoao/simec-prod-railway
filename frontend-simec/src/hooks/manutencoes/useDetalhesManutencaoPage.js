import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useManutencaoDetalhes } from '../useManutencaoDetalhes';
import { useModal } from '../shared/useModal';
import { useAlertas } from '../../contexts/AlertasContext';
import { useToast } from '../../contexts/ToastContext';
import { exportarOSManutencaoPDF } from '../../utils/pdfUtils';

export function useDetalhesManutencaoPage() {
  const { manutencaoId } = useParams();
  const navigate = useNavigate();
  const anexoInputRef = useRef(null);

  const { addToast } = useToast();
  const { refetchAlertas } = useAlertas();

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
    refetch: refetchManutencao,
  } = useManutencaoDetalhes(manutencaoId);

  const [formData, setFormData] = useState({
    descricaoProblemaServico: '',
    tecnicoResponsavel: '',
    dataInicioReal: '',
    horaInicioReal: '',
    dataFimReal: '',
    horaFimReal: '',
  });

  const [novaNota, setNovaNota] = useState('');

  const [confirmMode, setConfirmMode] = useState(null);
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacaoDecisao, setObservacaoDecisao] = useState('');

  const deleteAnexoModal = useModal();
  const cancelModal = useModal();

  useEffect(() => {
    if (!manutencao) return;

    const inicioReal = manutencao.dataInicioReal ? new Date(manutencao.dataInicioReal) : null;
    const fimReal = manutencao.dataFimReal ? new Date(manutencao.dataFimReal) : null;

    setFormData({
      descricaoProblemaServico: manutencao.descricaoProblemaServico || '',
      tecnicoResponsavel: manutencao.tecnicoResponsavel || '',
      dataInicioReal: inicioReal ? inicioReal.toISOString().split('T')[0] : '',
      horaInicioReal: inicioReal ? inicioReal.toTimeString().slice(0, 5) : '',
      dataFimReal: fimReal ? fimReal.toISOString().split('T')[0] : '',
      horaFimReal: fimReal ? fimReal.toTimeString().slice(0, 5) : '',
    });
  }, [manutencao]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNota = async () => {
    if (!novaNota.trim()) return;
    await adicionarNota(novaNota);
    setNovaNota('');
  };

  const handleAnexoUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const uploadData = new FormData();
    for (let i = 0; i < files.length; i += 1) {
      uploadData.append('arquivosManutencao', files[i]);
    }

    fazerUploadAnexo(uploadData);

    if (anexoInputRef.current) {
      anexoInputRef.current.value = null;
    }
  };

  const handleSalvarAlteracoes = async () => {
    const dataInicio = formData.dataInicioReal
      ? new Date(`${formData.dataInicioReal}T${formData.horaInicioReal || '00:00:00'}`)
      : null;

    const dataFim = formData.dataFimReal
      ? new Date(`${formData.dataFimReal}T${formData.horaFimReal || '00:00:00'}`)
      : null;

    const payload = {
      descricaoProblemaServico: formData.descricaoProblemaServico,
      tecnicoResponsavel: formData.tecnicoResponsavel,
      dataInicioReal: dataInicio ? dataInicio.toISOString() : null,
      dataFimReal: dataFim ? dataFim.toISOString() : null,
    };

    await salvarAtualizacoes(payload);
  };

  const handleConfirmacaoFinal = async () => {
    let payload = {};

    if (confirmMode === 'OK') {
      if (!dataTerminoReal) {
        addToast('Informe a data e hora de término.', 'error');
        return;
      }

      payload = {
        equipamentoOperante: true,
        dataTerminoReal: new Date(dataTerminoReal).toISOString(),
      };
    } else {
      if (!novaPrevisao || !observacaoDecisao.trim()) {
        addToast('Observação e Nova Previsão são obrigatórias.', 'error');
        return;
      }

      payload = {
        equipamentoOperante: false,
        novaPrevisao: new Date(novaPrevisao).toISOString(),
        observacao: observacaoDecisao,
      };
    }

    try {
      await concluirOS(payload);
      if (refetchAlertas) refetchAlertas();
      setConfirmMode(null);
    } catch (err) {
      console.error('Erro na confirmação:', err);
    }
  };

  const handlePrint = () => {
    exportarOSManutencaoPDF(manutencao);
  };

  const handleDeleteAnexo = async () => {
    if (!deleteAnexoModal.modalData) return;
    await removerAnexo(deleteAnexoModal.modalData.id);
    deleteAnexoModal.closeModal();
  };

  const goBack = () => {
    navigate('/manutencoes');
  };

  const camposPrincipaisBloqueados =
    manutencao?.status === 'Cancelada' || manutencao?.status === 'Concluida';

  const isCancelavel =
    manutencao?.status === 'Agendada' || manutencao?.status === 'EmAndamento';

  return {
    manutencaoId,
    manutencao,
    loading,
    error,
    submitting,
    anexoInputRef,

    formData,
    handleFormChange,
    handleSalvarAlteracoes,

    novaNota,
    setNovaNota,
    handleAddNota,

    confirmMode,
    setConfirmMode,
    dataTerminoReal,
    setDataTerminoReal,
    novaPrevisao,
    setNovaPrevisao,
    observacaoDecisao,
    setObservacaoDecisao,
    handleConfirmacaoFinal,

    handleAnexoUpload,
    handlePrint,
    handleDeleteAnexo,
    goBack,

    refetchManutencao,
    camposPrincipaisBloqueados,
    isCancelavel,

    deleteAnexoModal,
    cancelModal,
  };
}