import { useState, useEffect, useCallback } from 'react';

import {
  getEquipamentoById,
  addManutencao,
  getManutencoesPorEquipamento,
  addNotaAndamento,
  concluirManutencao,
} from '@/services/api';

import { exportarOSManutencaoPDF } from '@/services/api/pdfApi';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';

const NOVA_OCORRENCIA_INICIAL = {
  descricaoProblemaServico: '',
  detalhe: '',
  tecnicoResponsavel: '',
};

export function useEquipamentoFichaTecnica(equipamentoId) {
  const { addToast } = useToast();

  const [equipamento, setEquipamento] = useState(null);
  const [corretivas, setCorretivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingCorretivaId, setSubmittingCorretivaId] = useState(null);
  const [novaOcorrencia, setNovaOcorrencia] = useState(NOVA_OCORRENCIA_INICIAL);

  const carregarDados = useCallback(async () => {
    if (!equipamentoId) {
      setEquipamento(null);
      setCorretivas([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [equip, manutData] = await Promise.all([
        getEquipamentoById(equipamentoId),
        getManutencoesPorEquipamento(equipamentoId, { tipo: 'Corretiva', pageSize: 100 }),
      ]);

      setEquipamento(equip || null);
      setCorretivas(Array.isArray(manutData?.items) ? manutData.items : []);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao carregar dados.'), 'error');
      setEquipamento(null);
      setCorretivas([]);
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleOcorrenciaChange = useCallback((event) => {
    const { name, value } = event.target;
    setNovaOcorrencia((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmitOcorrencia = useCallback(
    async (event) => {
      event.preventDefault();

      if (!novaOcorrencia.descricaoProblemaServico.trim()) {
        addToast('Descricao do problema e obrigatoria.', 'error');
        return false;
      }

      setSubmitting(true);

      try {
        const nova = await addManutencao({
          equipamentoId,
          tipo: 'Corretiva',
          descricaoProblemaServico: novaOcorrencia.descricaoProblemaServico.trim(),
          tecnicoResponsavel: novaOcorrencia.tecnicoResponsavel.trim() || undefined,
        });

        // Se informou detalhe adicional, registra como primeira nota de andamento
        if (novaOcorrencia.detalhe.trim()) {
          try {
            const nota = await addNotaAndamento(nova.id, {
              nota: novaOcorrencia.detalhe.trim(),
            });
            nova.notasAndamento = [nota];
          } catch {
            // nota e opcional, nao bloqueia
          }
        }

        addToast('Ocorrencia registrada. OS aberta para acompanhamento.', 'success');
        setNovaOcorrencia(NOVA_OCORRENCIA_INICIAL);
        setCorretivas((prev) => [nova, ...prev]);

        return true;
      } catch (err) {
        addToast(getErrorMessage(err, 'Erro ao registrar ocorrencia.'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [novaOcorrencia, equipamentoId, addToast]
  );

  const handleResetNovaOcorrencia = useCallback(() => {
    setNovaOcorrencia(NOVA_OCORRENCIA_INICIAL);
  }, []);

  const handleAdicionarNotaCorretiva = useCallback(async (manutencaoId, nota) => {
    setSubmittingCorretivaId(manutencaoId);
    try {
      const novaNota = await addNotaAndamento(manutencaoId, { nota });
      addToast('Registro salvo.', 'success');
      setCorretivas((prev) =>
        prev.map((c) =>
          c.id === manutencaoId
            ? { ...c, notasAndamento: [novaNota, ...(c.notasAndamento || [])] }
            : c
        )
      );
      return true;
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao salvar registro.'), 'error');
      return false;
    } finally {
      setSubmittingCorretivaId(null);
    }
  }, [addToast]);

  const handleAgendarVisita = useCallback(async (manutencaoId, form) => {
    setSubmittingCorretivaId(manutencaoId);
    try {
      const atualizada = await concluirManutencao(manutencaoId, {
        acao: 'agendar_visita',
        ...form,
      });
      addToast('Visita agendada com sucesso!', 'success');
      setCorretivas((prev) => prev.map((c) => (c.id === manutencaoId ? atualizada : c)));
      return true;
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao agendar visita.'), 'error');
      return false;
    } finally {
      setSubmittingCorretivaId(null);
    }
  }, [addToast]);

  const handleResolverInternamente = useCallback(async (manutencaoId, observacao) => {
    setSubmittingCorretivaId(manutencaoId);
    try {
      const atualizada = await concluirManutencao(manutencaoId, {
        acao: 'resolver_internamente',
        observacao,
      });
      addToast('Problema resolvido e OS encerrada.', 'success');
      setCorretivas((prev) => prev.map((c) => (c.id === manutencaoId ? atualizada : c)));
      return true;
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao registrar resolucao.'), 'error');
      return false;
    } finally {
      setSubmittingCorretivaId(null);
    }
  }, [addToast]);

  const handleConcluirAcaoCorretiva = useCallback(async (manutencaoId, payload) => {
    setSubmittingCorretivaId(manutencaoId);
    try {
      const atualizada = await concluirManutencao(manutencaoId, payload);
      addToast('OS atualizada com sucesso!', 'success');
      setCorretivas((prev) => prev.map((c) => (c.id === manutencaoId ? atualizada : c)));
      return true;
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao atualizar OS.'), 'error');
      return false;
    } finally {
      setSubmittingCorretivaId(null);
    }
  }, [addToast]);

  const handleImprimirOS = useCallback(async (manutencaoId) => {
    try {
      await exportarOSManutencaoPDF(manutencaoId);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao gerar PDF.'), 'error');
    }
  }, [addToast]);

  return {
    equipamento,
    corretivas,
    loading,
    submitting,
    submittingCorretivaId,
    novaOcorrencia,
    carregarDados,
    handleOcorrenciaChange,
    handleSubmitOcorrencia,
    handleResetNovaOcorrencia,
    handleAdicionarNotaCorretiva,
    handleAgendarVisita,
    handleResolverInternamente,
    handleConcluirAcaoCorretiva,
    handleImprimirOS,
  };
}
