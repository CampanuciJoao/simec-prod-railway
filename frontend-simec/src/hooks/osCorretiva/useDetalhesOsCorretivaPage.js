import { useState, useCallback, useEffect } from 'react';
import {
  getOsCorretivaById,
  adicionarNota,
  editarNotaOsCorretiva,
  editarDescricaoOsCorretiva,
  agendarVisita,
  reagendarVisita,
  registrarResultadoVisita,
  concluirOsCorretiva,
  cancelarOsCorretiva,
  downloadPdfOsCorretiva,
  moverOsCorretivaEquipamento,
  uploadAnexosOsCorretiva,
  removerAnexoOsCorretiva,
} from '../../services/api/osCorretivaApi';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';

export function useDetalhesOsCorretivaPage(osId) {
  const { addToast } = useToast();

  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const notaModal = useModal();
  const editarNotaModal = useModal();
  const editarDescricaoModal = useModal();
  const visitaModal = useModal();
  const reagendarVisitaModal = useModal();
  const resultadoModal = useModal();
  const concluirModal = useModal();
  const cancelarModal = useModal();
  const moverModal = useModal();

  const fetchOs = useCallback(async () => {
    if (!osId) return;
    try {
      setLoading(true);
      setError('');
      const data = await getOsCorretivaById(osId);
      setOs(data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar OS Corretiva.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [osId, addToast]);

  useEffect(() => {
    fetchOs();
  }, [fetchOs]);

  const handleAdicionarNota = useCallback(async (dados) => {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await adicionarNota(osId, dados);
      addToast('Nota adicionada com sucesso.', 'success');
      notaModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao adicionar nota.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, notaModal, fetchOs]);

  const handleEditarNota = useCallback(async (dados) => {
    const notaId = editarNotaModal.modalData?.id;
    if (!notaId) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      await editarNotaOsCorretiva(osId, notaId, dados);
      addToast('Nota atualizada com sucesso.', 'success');
      editarNotaModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao editar nota.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, editarNotaModal, fetchOs]);

  const handleAgendarVisita = useCallback(async (dados) => {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await agendarVisita(osId, dados);
      addToast('Visita agendada com sucesso.', 'success');
      visitaModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao agendar visita.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, visitaModal, fetchOs]);

  const handleReagendarVisita = useCallback(async (dados) => {
    const visitaId = reagendarVisitaModal.modalData?.id;
    if (!visitaId) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      await reagendarVisita(osId, visitaId, dados);
      addToast('Visita reagendada com sucesso.', 'success');
      reagendarVisitaModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao reagendar visita.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, reagendarVisitaModal, fetchOs]);

  const handleRegistrarResultado = useCallback(async (dados, visitaIdOverride) => {
    const visitaId = visitaIdOverride || resultadoModal.modalData?.visitaId;
    if (!visitaId) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      await registrarResultadoVisita(osId, visitaId, dados);
      addToast('Resultado registrado com sucesso.', 'success');
      resultadoModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao registrar resultado.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, resultadoModal, fetchOs]);

  const handleConcluirOs = useCallback(async (dados) => {
    setSubmitting(true);
    try {
      await concluirOsCorretiva(osId, dados);
      addToast('OS Corretiva concluída com sucesso.', 'success');
      concluirModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao concluir OS.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, concluirModal, fetchOs]);

  const handleCancelarOs = useCallback(async (motivoCancelamento) => {
    setSubmitting(true);
    try {
      await cancelarOsCorretiva(osId, motivoCancelamento);
      addToast('OS Corretiva cancelada.', 'success');
      cancelarModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao cancelar OS.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, cancelarModal, fetchOs]);

  const handleMoverEquipamento = useCallback(async (dados) => {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await moverOsCorretivaEquipamento(osId, dados);
      addToast('OS movida para o novo equipamento.', 'success');
      moverModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao mover OS.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, moverModal, fetchOs]);

  const handleEditarDescricao = useCallback(async (dados) => {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await editarDescricaoOsCorretiva(osId, dados);
      addToast('Descrição da OS atualizada.', 'success');
      editarDescricaoModal.closeModal();
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao editar descrição.';
      setFieldErrors(err?.response?.data?.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, editarDescricaoModal, fetchOs]);

  const handleUploadAnexos = useCallback(async (formData) => {
    setSubmitting(true);
    try {
      await uploadAnexosOsCorretiva(osId, formData);
      addToast('Anexo(s) enviado(s) com sucesso.', 'success');
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao enviar anexo.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, fetchOs]);

  const handleRemoverAnexo = useCallback(async (anexoId) => {
    setSubmitting(true);
    try {
      await removerAnexoOsCorretiva(osId, anexoId);
      addToast('Anexo removido.', 'success');
      await fetchOs();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao remover anexo.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [osId, addToast, fetchOs]);

  const handleExportarPdf = useCallback(async () => {
    try {
      const response = await downloadPdfOsCorretiva(osId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OS_CORT_${os?.numeroOS || osId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      addToast('Erro ao gerar PDF da OS.', 'error');
    }
  }, [osId, os, addToast]);

  return {
    os,
    loading,
    submitting,
    error,
    fieldErrors,
    notaModal,
    editarNotaModal,
    editarDescricaoModal,
    visitaModal,
    reagendarVisitaModal,
    resultadoModal,
    concluirModal,
    cancelarModal,
    moverModal,
    handleAdicionarNota,
    handleEditarNota,
    handleEditarDescricao,
    handleAgendarVisita,
    handleReagendarVisita,
    handleRegistrarResultado,
    handleConcluirOs,
    handleCancelarOs,
    handleMoverEquipamento,
    handleExportarPdf,
    handleUploadAnexos,
    handleRemoverAnexo,
    refetch: fetchOs,
  };
}
