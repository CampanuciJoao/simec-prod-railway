import { useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '../../utils/getErrorMessage';
import {
  uploadAnexoByResource,
  deleteAnexoByResource,
} from '../../services/api';

export function useResourceAnexos({
  resource,
  resourceId,
  anexosIniciais = [],
  onUpdate,
}) {
  const inputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [anexoSelecionado, setAnexoSelecionado] = useState(null);
  const [error, setError] = useState('');

  const anexos = useMemo(
    () => (Array.isArray(anexosIniciais) ? anexosIniciais : []),
    [anexosIniciais]
  );

  const openFileDialog = () => {
    if (!isSubmitting) {
      inputRef.current?.click();
    }
  };

  const openDeleteModal = (anexo) => {
    setAnexoSelecionado(anexo);
    setDeleteModalOpen(true);
    setError('');
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setAnexoSelecionado(null);
  };

  const refreshParent = async () => {
    if (typeof onUpdate === 'function') {
      await onUpdate();
    }
  };

  const uploadFiles = async (files = []) => {
    if (!resourceId || !files.length) return false;

    try {
      setIsSubmitting(true);
      setError('');

      const formData = new FormData();

      for (const file of files) {
        formData.append('file', file);
      }

      await uploadAnexoByResource(resource, resourceId, formData);
      await refreshParent();

      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao enviar anexos.'));
      return false;
    } finally {
      setIsSubmitting(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleInputChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    await uploadFiles(files);
  };

  const confirmDelete = async () => {
    if (!resourceId || !anexoSelecionado?.id) return false;

    try {
      setIsSubmitting(true);
      setError('');

      await deleteAnexoByResource(resource, resourceId, anexoSelecionado.id);
      await refreshParent();
      closeDeleteModal();

      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao excluir anexo.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    anexos,
    error,
    isSubmitting,
    inputRef,
    deleteModalOpen,
    anexoSelecionado,
    openFileDialog,
    openDeleteModal,
    closeDeleteModal,
    handleInputChange,
    confirmDelete,
    uploadFiles,
  };
}