import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOsCorretivaById,
  adicionarNota,
  agendarVisita,
  registrarResultadoVisita,
  concluirOsCorretiva,
  downloadPdfOsCorretiva,
} from '../../services/api/osCorretivaApi';
import { useModal } from '../shared/useModal';
import { useToast } from '../../contexts/ToastContext';

export function useDetalhesOsCorretivaPage(osId) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const notaModal = useModal();
  const visitaModal = useModal();
  const resultadoModal = useModal();
  const concluirModal = useModal();

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

  const handleRegistrarResultado = useCallback(async (dados) => {
    const visitaId = resultadoModal.modalData?.visitaId;
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
    visitaModal,
    resultadoModal,
    concluirModal,
    handleAdicionarNota,
    handleAgendarVisita,
    handleRegistrarResultado,
    handleConcluirOs,
    handleExportarPdf,
    refetch: fetchOs,
  };
}
