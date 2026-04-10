// src/hooks/useModal.js
// CÓDIGO COMPLETO

import { useState, useCallback } from 'react';

/**
 * Um hook customizado para gerenciar o estado de um modal.
 * Retorna o estado de visibilidade, os dados associados ao modal,
 * e funções para abrir e fechar.
 * @returns {{
 *   isOpen: boolean,
 *   modalData: any | null,
 *   openModal: (data?: any) => void,
 *   closeModal: () => void
 * }}
 */
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Este estado vai guardar qualquer dado que precisarmos passar para o modal
  // (ex: o objeto do item a ser excluído).
  const [modalData, setModalData] = useState(null);

  const openModal = useCallback((data = null) => {
    setModalData(data);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Limpa os dados ao fechar para evitar que dados antigos "vazem"
    setModalData(null);
  }, []);

  return {
    isOpen,
    modalData,
    openModal,
    closeModal,
  };
}