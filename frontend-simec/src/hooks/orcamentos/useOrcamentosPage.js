import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrcamentos } from './useOrcamentos';
import { useModal } from '@/hooks/shared/useModal';
import { deleteOrcamento } from '@/services/api/orcamentosApi';
import { useToast } from '@/contexts/ToastContext';

export function useOrcamentosPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const orcamentosState = useOrcamentos();
  const deleteModal = useModal();

  const irParaNovo = useCallback(() => navigate('/orcamentos/novo'), [navigate]);

  const irParaEditar = useCallback(
    (id) => navigate(`/orcamentos/${id}/editar`),
    [navigate]
  );

  const irParaDetalhes = useCallback(
    (id) => navigate(`/orcamentos/${id}`),
    [navigate]
  );

  const confirmarExclusao = useCallback(async () => {
    const id = deleteModal.modalData?.id;
    if (!id) return;
    try {
      await deleteOrcamento(id);
      addToast('Orçamento excluído com sucesso.', 'success');
      deleteModal.closeModal();
      orcamentosState.carregar();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao excluir orçamento.', 'error');
    }
  }, [deleteModal, addToast, orcamentosState]);

  return {
    ...orcamentosState,
    deleteModal,
    irParaNovo,
    irParaEditar,
    irParaDetalhes,
    confirmarExclusao,
  };
}
