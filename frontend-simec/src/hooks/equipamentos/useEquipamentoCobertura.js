import { useCallback, useEffect, useMemo, useState } from 'react';

import { getContratos, getSeguros } from '@/services/api';
import { getDynamicStatus } from '@/utils/contratos';
import { getStatusDinamicoSeguro, getNomeUnidadeSeguro } from '@/hooks/seguros/useSeguros';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';

function filtrarContratosRelacionados(contratos, equipamento) {
  if (!equipamento) return [];

  return contratos.filter((contrato) => {
    const cobreEquipamento = (contrato?.equipamentosCobertos || []).some(
      (item) => String(item.id) === String(equipamento.id)
    );

    const cobreUnidade = (contrato?.unidadesCobertas || []).some(
      (item) => String(item.id) === String(equipamento.unidadeId)
    );

    return cobreEquipamento || cobreUnidade;
  });
}

function filtrarSegurosRelacionados(seguros, equipamento) {
  if (!equipamento) return [];

  return seguros.filter((seguro) => {
    const equipamentoRelacionado =
      String(seguro?.equipamentoId || seguro?.equipamento?.id || '') ===
      String(equipamento.id);

    const unidadeRelacionada =
      String(seguro?.unidadeId || seguro?.unidade?.id || '') ===
      String(equipamento.unidadeId || '');

    return equipamentoRelacionado || unidadeRelacionada;
  });
}

export function useEquipamentoCobertura(equipamento) {
  const { addToast } = useToast();
  const [contratos, setContratos] = useState([]);
  const [seguros, setSeguros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarCobertura = useCallback(async () => {
    if (!equipamento?.id) {
      setContratos([]);
      setSeguros([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [contratosData, segurosData] = await Promise.all([
        getContratos(),
        getSeguros(),
      ]);

      setContratos(Array.isArray(contratosData) ? contratosData : []);
      setSeguros(Array.isArray(segurosData) ? segurosData : []);
    } catch (err) {
      const mensagem = getErrorMessage(
        err,
        'Erro ao carregar cobertura do equipamento.'
      );
      setError(mensagem);
      addToast(mensagem, 'error');
      setContratos([]);
      setSeguros([]);
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id, addToast]);

  useEffect(() => {
    carregarCobertura();
  }, [carregarCobertura]);

  const contratosRelacionados = useMemo(
    () => filtrarContratosRelacionados(contratos, equipamento),
    [contratos, equipamento]
  );

  const segurosRelacionados = useMemo(
    () => filtrarSegurosRelacionados(seguros, equipamento),
    [seguros, equipamento]
  );

  const resumo = useMemo(
    () => ({
      contratos: contratosRelacionados.length,
      seguros: segurosRelacionados.length,
      contratosAtivos: contratosRelacionados.filter(
        (item) => getDynamicStatus(item) === 'Ativo'
      ).length,
      segurosAtivos: segurosRelacionados.filter(
        (item) => getStatusDinamicoSeguro(item) === 'Ativo'
      ).length,
      unidadeNome:
        equipamento?.unidade?.nomeSistema ||
        (segurosRelacionados[0]
          ? getNomeUnidadeSeguro(segurosRelacionados[0])
          : ''),
    }),
    [contratosRelacionados, segurosRelacionados, equipamento]
  );

  return {
    contratosRelacionados,
    segurosRelacionados,
    loading,
    error,
    resumo,
    refetch: carregarCobertura,
  };
}
