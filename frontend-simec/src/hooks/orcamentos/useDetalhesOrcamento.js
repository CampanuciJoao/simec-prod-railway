import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getOrcamentoById,
  enviarParaAprovacao,
  aprovarOrcamento,
  rejeitarOrcamento,
} from '@/services/api/orcamentosApi';
import { useToast } from '@/contexts/ToastContext';
import { useModal } from '@/hooks/shared/useModal';

export function useDetalhesOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const rejeitarModal = useModal();
  const aprovarModal = useModal();
  const enviarModal = useModal();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrcamentoById(id);
      setOrcamento(data);
    } catch {
      addToast('Erro ao carregar orçamento.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleEnviarAprovacao = useCallback(async () => {
    setActionLoading(true);
    try {
      const updated = await enviarParaAprovacao(id);
      setOrcamento(updated);
      addToast('Orçamento enviado para aprovação.', 'success');
      enviarModal.closeModal();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao enviar para aprovação.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [id, addToast, enviarModal]);

  const handleAprovar = useCallback(async () => {
    setActionLoading(true);
    try {
      const updated = await aprovarOrcamento(id);
      setOrcamento(updated);
      addToast('Orçamento aprovado com sucesso.', 'success');
      aprovarModal.closeModal();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao aprovar orçamento.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [id, addToast, aprovarModal]);

  const handleRejeitar = useCallback(async () => {
    if (!motivoRejeicao.trim()) {
      addToast('Informe o motivo da rejeição.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await rejeitarOrcamento(id, motivoRejeicao);
      setOrcamento(updated);
      addToast('Orçamento rejeitado.', 'success');
      rejeitarModal.closeModal();
      setMotivoRejeicao('');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao rejeitar orçamento.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [id, motivoRejeicao, addToast, rejeitarModal]);

  const irParaEditar = useCallback(
    () => navigate(`/orcamentos/${id}/editar`),
    [navigate, id]
  );

  const calcularTotalFornecedor = useCallback(
    (fornecedorId) => {
      if (!orcamento) return 0;
      return (orcamento.itens || []).reduce((sum, item) => {
        const preco = (item.precos || []).find((p) => p.fornecedorId === fornecedorId);
        if (!preco) return sum;
        return sum + Math.max(0, Number(preco.valor || 0) - Number(preco.desconto || 0));
      }, 0);
    },
    [orcamento]
  );

  return {
    orcamento,
    loading,
    actionLoading,
    motivoRejeicao,
    setMotivoRejeicao,
    rejeitarModal,
    aprovarModal,
    enviarModal,
    handleEnviarAprovacao,
    handleAprovar,
    handleRejeitar,
    irParaEditar,
    calcularTotalFornecedor,
  };
}
