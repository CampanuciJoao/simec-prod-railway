import { useState, useEffect, useCallback } from 'react';

import {
  getEquipamentoById,
  getOcorrenciasPorEquipamento,
  addOcorrencia,
  resolverOcorrencia,
  addManutencao,
  getManutencoesPorEquipamento,
  addNotaAndamento,
  concluirManutencao,
} from '@/services/api';

import { getPdfDataManutencao } from '@/services/api/pdfApi';
import { exportarOSManutencaoPDFLazy } from '@/services/pdf/pdfExportService';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';

const NOVO_EVENTO_INICIAL = {
  titulo: '',
  descricao: '',
  tipo: 'Operacional',
  tecnico: '',
  origem: 'usuario',
  gravidade: 'media',
};

export function useEquipamentoFichaTecnica(equipamentoId) {
  const { addToast } = useToast();

  const [equipamento, setEquipamento] = useState(null);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [corretivas, setCorretivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingCorretivaId, setSubmittingCorretivaId] = useState(null);
  const [submittingNova, setSubmittingNova] = useState(false);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  const [resolvendoId, setResolvendoId] = useState(null);
  const [dadosSolucao, setDadosSolucao] = useState({});
  const [novoEvento, setNovoEvento] = useState(NOVO_EVENTO_INICIAL);

  const carregarDados = useCallback(async () => {
    if (!equipamentoId) {
      setEquipamento(null);
      setOcorrencias([]);
      setCorretivas([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [equip, lista, manutData] = await Promise.all([
        getEquipamentoById(equipamentoId),
        getOcorrenciasPorEquipamento(equipamentoId),
        getManutencoesPorEquipamento(equipamentoId, { tipo: 'Corretiva', pageSize: 100 }),
      ]);

      setEquipamento(equip || null);
      setOcorrencias(Array.isArray(lista) ? lista : []);
      setCorretivas(Array.isArray(manutData?.items) ? manutData.items : []);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao carregar dados.'), 'error');
      setEquipamento(null);
      setOcorrencias([]);
      setCorretivas([]);
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleExpandir = useCallback((itemId) => {
    setItensExpandidos((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }, []);

  const handleEventoChange = useCallback((event) => {
    const { name, value } = event.target;

    setNovoEvento((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmitEvento = useCallback(
    async (event) => {
      event.preventDefault();

      if (!novoEvento.titulo.trim()) {
        addToast('Titulo do evento e obrigatorio.', 'error');
        return false;
      }

      setSubmitting(true);

      try {
        const criado = await addOcorrencia({
          equipamentoId,
          titulo: novoEvento.titulo.trim(),
          descricao: novoEvento.descricao.trim(),
          tipo: novoEvento.tipo,
          tecnico: novoEvento.tecnico.trim(),
          origem: novoEvento.origem,
          gravidade: novoEvento.gravidade,
        });

        addToast('Evento registrado com sucesso!', 'success');
        setNovoEvento(NOVO_EVENTO_INICIAL);
        setOcorrencias((prev) => [criado, ...prev]);
        setItensExpandidos((prev) => new Set(prev).add(criado.id));

        return true;
      } catch (err) {
        addToast(getErrorMessage(err, 'Erro ao registrar evento.'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [novoEvento, equipamentoId, addToast]
  );

  const handleSolucaoChange = useCallback((ocorrenciaId, campo, valor) => {
    setDadosSolucao((prev) => ({
      ...prev,
      [ocorrenciaId]: {
        ...prev[ocorrenciaId],
        [campo]: valor,
      },
    }));
  }, []);

  const handleAbrirResolucao = useCallback((ocorrenciaId) => {
    setResolvendoId(ocorrenciaId);
  }, []);

  const handleCancelarResolucao = useCallback(() => {
    setResolvendoId(null);
  }, []);

  const handleSalvarSolucao = useCallback(
    async (ocorrenciaId) => {
      const payload = dadosSolucao[ocorrenciaId] || {};

      if (!payload.solucao || !payload.solucao.trim()) {
        addToast('Descreva a solucao.', 'error');
        return false;
      }

      setSubmitting(true);

      try {
        const atualizada = await resolverOcorrencia(ocorrenciaId, {
          solucao: payload.solucao.trim(),
          tecnicoResolucao: String(payload.tecnicoResolucao || '').trim(),
        });

        addToast('Evento resolvido com sucesso!', 'success');

        setOcorrencias((prev) =>
          prev.map((item) => (item.id === ocorrenciaId ? atualizada : item))
        );

        setDadosSolucao((prev) => {
          const next = { ...prev };
          delete next[ocorrenciaId];
          return next;
        });

        setResolvendoId(null);

        return true;
      } catch (err) {
        addToast(getErrorMessage(err, 'Erro ao salvar solucao.'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [dadosSolucao, addToast]
  );

  const handleResetNovoEvento = useCallback(() => {
    setNovoEvento(NOVO_EVENTO_INICIAL);
  }, []);

  const handleRegistrarProblema = useCallback(async () => {
    setSubmittingNova(true);
    try {
      const nova = await addManutencao({
        equipamentoId,
        tipo: 'Corretiva',
        descricaoProblemaServico: '',
      });
      addToast('OS corretiva criada. Adicione o descritivo e acompanhe pelo registro aberto.', 'success');
      setCorretivas((prev) => [nova, ...prev]);
      return true;
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao registrar problema.'), 'error');
      return false;
    } finally {
      setSubmittingNova(false);
    }
  }, [equipamentoId, addToast]);

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
      const dados = await getPdfDataManutencao(manutencaoId);
      await exportarOSManutencaoPDFLazy(dados);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao gerar PDF.'), 'error');
    }
  }, [addToast]);

  return {
    equipamento,
    ocorrencias,
    corretivas,
    loading,
    submitting,
    submittingCorretivaId,
    submittingNova,
    novoEvento,
    itensExpandidos,
    resolvendoId,
    dadosSolucao,
    carregarDados,
    toggleExpandir,
    handleEventoChange,
    handleSubmitEvento,
    handleResetNovoEvento,
    handleSolucaoChange,
    handleAbrirResolucao,
    handleCancelarResolucao,
    handleSalvarSolucao,
    handleRegistrarProblema,
    handleAdicionarNotaCorretiva,
    handleAgendarVisita,
    handleResolverInternamente,
    handleConcluirAcaoCorretiva,
    handleImprimirOS,
  };
}
