import { useState, useEffect, useCallback, useMemo } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { useModal } from '@/hooks/shared/useModal';
import {
  getEmailsNotificacao,
  addEmailNotificacao,
  updateEmailNotificacao,
  deleteEmailNotificacao,
} from '@/services/api';

export function useEmailsNotificacaoPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);

  const { addToast } = useToast();

  const {
    isOpen: isDeleteModalOpen,
    modalData: emailToDelete,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();

  const fetchEmails = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getEmailsNotificacao();
      setEmails(Array.isArray(data) ? data : []);
    } catch (err) {
      setEmails([]);
      addToast(
        err?.response?.data?.message || 'Erro ao carregar lista de e-mails.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleOpenCreate = useCallback(() => {
    setEditingEmail(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((email) => {
    setEditingEmail(email);
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    if (isSubmitting) return;

    setIsFormModalOpen(false);
    setEditingEmail(null);
  }, [isSubmitting]);

  const handleSave = useCallback(
    async (formData) => {
      setIsSubmitting(true);

      try {
        if (editingEmail?.id) {
          await updateEmailNotificacao(editingEmail.id, formData);
          addToast('Configurações de e-mail atualizadas!', 'success');
        } else {
          await addEmailNotificacao(formData);
          addToast('E-mail adicionado com sucesso!', 'success');
        }

        await fetchEmails();
        handleCloseFormModal();
      } catch (err) {
        addToast(
          err?.response?.data?.message ||
            'Ocorreu um erro ao salvar o e-mail.',
          'error'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingEmail, addToast, fetchEmails, handleCloseFormModal]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!emailToDelete?.id) return;

    try {
      await deleteEmailNotificacao(emailToDelete.id);
      addToast('E-mail removido com sucesso!', 'success');
      await fetchEmails();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao remover e-mail.',
        'error'
      );
    } finally {
      closeDeleteModal();
    }
  }, [emailToDelete, addToast, fetchEmails, closeDeleteModal]);

  const isEmpty = !loading && emails.length === 0;

  const formModalTitle = useMemo(
    () =>
      editingEmail
        ? 'Editar Configurações de E-mail'
        : 'Adicionar Novo E-mail',
    [editingEmail]
  );

  return {
    emails,
    loading,
    isEmpty,

    isSubmitting,
    isFormModalOpen,
    editingEmail,
    formModalTitle,

    isDeleteModalOpen,
    emailToDelete,

    fetchEmails,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseFormModal,
    handleSave,

    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
  };
}