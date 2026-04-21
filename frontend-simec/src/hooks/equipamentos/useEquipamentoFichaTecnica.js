import { useState, useEffect, useCallback } from 'react';

import {
  getEquipamentoById,
  getOcorrenciasPorEquipamento,
  addOcorrencia,
  resolverOcorrencia,
} from '@/services/api';

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  const [resolvendoId, setResolvendoId] = useState(null);
  const [dadosSolucao, setDadosSolucao] = useState({});
  const [novoEvento, setNovoEvento] = useState(NOVO_EVENTO_INICIAL);

  const carregarDados = useCallback(async () => {
    if (!equipamentoId) {
      setEquipamento(null);
      setOcorrencias([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [equip, lista] = await Promise.all([
        getEquipamentoById(equipamentoId),
        getOcorrenciasPorEquipamento(equipamentoId),
      ]);

      setEquipamento(equip || null);
      setOcorrencias(Array.isArray(lista) ? lista : []);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao carregar dados.'), 'error');
      setEquipamento(null);
      setOcorrencias([]);
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

  return {
    equipamento,
    ocorrencias,
    loading,
    submitting,
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
  };
}
