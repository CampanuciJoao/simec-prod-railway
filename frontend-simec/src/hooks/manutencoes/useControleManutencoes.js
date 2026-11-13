import { useCallback, useEffect, useState } from 'react';
import api from '@/services/http/apiClient';

export function useControleManutencoes() {
  const [data, setData] = useState({ equipamentos: [], prediais: [], resumo: null });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const resp = await api.get('/manutencoes/controle');
      setData(resp.data || { equipamentos: [], prediais: [], resumo: null });
    } catch (err) {
      setErro(err?.response?.data?.message || err.message || 'Erro ao carregar controle.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ...data, loading, erro, refetch: carregar };
}

// Busca o historico de uma rotina especifica — usado pelo modal com
// download de PDF das ultimas N manutencoes concluidas.
export async function buscarHistoricoControle({
  equipamentoId, unidadePredialId, tipoServicoPredial, limite = 10,
}) {
  const params = {};
  if (equipamentoId) params.equipamentoId = equipamentoId;
  if (unidadePredialId) params.unidadePredialId = unidadePredialId;
  if (tipoServicoPredial) params.tipoServicoPredial = tipoServicoPredial;
  params.limite = limite;
  const resp = await api.get('/manutencoes/controle/historico', { params });
  return resp.data || [];
}

// Backfill: cria uma Manutencao ja Concluida numa data passada pra
// alimentar o historico da rotina. Usado pelo modal do Controle.
export async function registrarExecucaoPassada({
  equipamentoId, unidadePredialId, tipoServicoPredial,
  dataExecucao, tecnicoResponsavel, descricao,
}) {
  const resp = await api.post('/manutencoes/controle/registrar-execucao-passada', {
    equipamentoId: equipamentoId || null,
    unidadePredialId: unidadePredialId || null,
    tipoServicoPredial: tipoServicoPredial || null,
    dataExecucao,
    tecnicoResponsavel: tecnicoResponsavel || null,
    descricao: descricao || null,
  });
  return resp.data;
}
