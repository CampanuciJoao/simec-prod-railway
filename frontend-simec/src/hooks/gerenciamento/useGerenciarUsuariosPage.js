import { useState, useEffect, useCallback } from 'react';

import {
  getUsuarios,
  criarUsuario,
  updateUsuario,
  deletarUsuario,
} from '@/services/api';

import { useToast } from '@/contexts/ToastContext';
import { useModal } from '@/hooks/shared/useModal';
import { useAuth } from '@/contexts/AuthContext';

export function useGerenciarUsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { addToast } = useToast();
  const { user: usuarioLogado } = useAuth();

  const {
    isOpen: isDeleteModalOpen,
    modalData: userToDelete,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUsuarios();
      setUsuarios(Array.isArray(response) ? response : []);
    } catch (err) {
      setUsuarios([]);
      addToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleCreate = useCallback(() => {
    setEditingUser(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((user) => {
    setEditingUser(user);
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingUser(null);
  }, []);

  const handleSave = useCallback(
    async (formData) => {
      setIsSubmittingForm(true);

      try {
        if (editingUser?.id) {
          await updateUsuario(editingUser.id, formData);
          addToast('Usuário atualizado com sucesso!', 'success');
        } else {
          await criarUsuario(formData);
          addToast('Usuário criado com sucesso!', 'success');
        }

        await fetchUsuarios();
        handleCancelForm();
      } catch (err) {
        addToast(
          err?.response?.data?.message || 'Erro ao salvar usuário.',
          'error'
        );
      } finally {
        setIsSubmittingForm(false);
      }
    },
    [editingUser, addToast, fetchUsuarios, handleCancelForm]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete?.id) return;

    try {
      await deletarUsuario(userToDelete.id);
      addToast('Usuário excluído com sucesso!', 'success');
      await fetchUsuarios();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao excluir usuário.',
        'error'
      );
    } finally {
      closeDeleteModal();
    }
  }, [userToDelete, addToast, fetchUsuarios, closeDeleteModal]);

  const isEmpty = !loading && usuarios.length === 0;

  return {
    usuarios,
    loading,
    isEmpty,

    showForm,
    isSubmittingForm,
    editingUser,

    isDeleteModalOpen,
    userToDelete,
    usuarioLogadoId: usuarioLogado?.id,

    handleCreate,
    handleEdit,
    handleCancelForm,
    handleSave,

    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
  };
}