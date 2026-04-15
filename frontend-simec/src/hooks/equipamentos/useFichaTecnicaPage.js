import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  metadataTexto: '',
};

export function useFichaTecnicaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    setLoading(true);

    try {
      const [equip, lista] = await Promise.all([
        getEquipamentoById(id),
        getOcorrenciasPorEquipamento(id),
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
  }, [id, addToast]);

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
        addToast('Título do evento é obrigatório.', 'error');
        return;
      }

      setSubmitting(true);

      try {
        let metadata = null;

        if (novoEvento.metadataTexto.trim()) {
          try {
            metadata = JSON.parse(novoEvento.metadataTexto);
          } catch {
            addToast('metadata deve ser um JSON válido.', 'error');
            setSubmitting(false);
            return;
          }
        }

        const criado = await addOcorrencia({
          equipamentoId: id,
          titulo: novoEvento.titulo.trim(),
          descricao: novoEvento.descricao.trim(),
          tipo: novoEvento.tipo,
          tecnico: novoEvento.tecnico.trim(),
          origem: novoEvento.origem,
          gravidade: novoEvento.gravidade,
          metadata,
        });

        addToast('Evento registrado com sucesso!', 'success');

        setNovoEvento(NOVO_EVENTO_INICIAL);
        setOcorrencias((prev) => [criado, ...prev]);
      } catch (err) {
        addToast(getErrorMessage(err, 'Erro ao registrar evento.'), 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [novoEvento, id, addToast]
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
        addToast('Descreva a solução.', 'error');
        return;
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
      } catch (err) {
        addToast(getErrorMessage(err, 'Erro ao salvar solução.'), 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [dadosSolucao, addToast]
  );

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
    handleSolucaoChange,
    handleAbrirResolucao,
    handleCancelarResolucao,
    handleSalvarSolucao,

    goBack: () => navigate('/equipamentos'),
  };
}