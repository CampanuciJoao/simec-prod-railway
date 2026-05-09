import { useState, useEffect, useCallback, useMemo } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { useModal } from '@/hooks/shared/useModal';
import {
  getTelegramDestinatarios,
  addTelegramDestinatario,
  updateTelegramDestinatario,
  deleteTelegramDestinatario,
  gerarTelegramToken,
} from '@/services/api';

export function useTelegramNotificacaoPage() {
  const [destinatarios, setDestinatarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState(null);

  const [tokenData, setTokenData] = useState(null);
  const [gerandoToken, setGerandoToken] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  const { addToast } = useToast();
  const {
    isOpen: isDeleteModalOpen,
    modalData: destToDelete,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();

  const fetchDestinatarios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTelegramDestinatarios();
      setDestinatarios(Array.isArray(data) ? data : []);
    } catch {
      setDestinatarios([]);
      addToast('Erro ao carregar destinatários do Telegram.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDestinatarios();
  }, [fetchDestinatarios]);

  const handleOpenCreate = useCallback(() => {
    setEditingDest(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((dest) => {
    setEditingDest(dest);
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    if (isSubmitting) return;
    setIsFormModalOpen(false);
    setEditingDest(null);
  }, [isSubmitting]);

  const handleSave = useCallback(async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingDest?.id) {
        await updateTelegramDestinatario(editingDest.id, formData);
        addToast('Destinatário atualizado!', 'success');
      } else {
        await addTelegramDestinatario(formData);
        addToast('Destinatário adicionado!', 'success');
      }
      await fetchDestinatarios();
      handleCloseFormModal();
    } catch (err) {
      addToast(err?.response?.data?.erro || 'Erro ao salvar destinatário.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingDest, addToast, fetchDestinatarios, handleCloseFormModal]);

  const handleConfirmDelete = useCallback(async () => {
    if (!destToDelete?.id) return;
    try {
      await deleteTelegramDestinatario(destToDelete.id);
      addToast('Destinatário removido.', 'success');
      await fetchDestinatarios();
    } catch {
      addToast('Erro ao remover destinatário.', 'error');
    } finally {
      closeDeleteModal();
    }
  }, [destToDelete, addToast, fetchDestinatarios, closeDeleteModal]);

  const handleGerarToken = useCallback(async () => {
    setGerandoToken(true);
    try {
      const data = await gerarTelegramToken();
      setTokenData(data);
      setIsTokenModalOpen(true);
    } catch {
      addToast('Erro ao gerar código de vinculação.', 'error');
    } finally {
      setGerandoToken(false);
    }
  }, [addToast]);

  const isEmpty = !loading && destinatarios.length === 0;

  const formModalTitle = useMemo(
    () => (editingDest ? 'Editar Destinatário' : 'Adicionar Destinatário'),
    [editingDest]
  );

  return {
    destinatarios,
    loading,
    isEmpty,
    isSubmitting,
    isFormModalOpen,
    editingDest,
    formModalTitle,
    isDeleteModalOpen,
    destToDelete,
    tokenData,
    gerandoToken,
    isTokenModalOpen,
    fetchDestinatarios,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseFormModal,
    handleSave,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
    handleGerarToken,
    closeTokenModal: () => setIsTokenModalOpen(false),
  };
}
