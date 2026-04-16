import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useBINavigation(rankingUnidades = []) {
  const navigate = useNavigate();

  const goToRoute = useCallback((pathname, state = undefined) => {
    navigate(pathname, state ? { state } : undefined);
  }, [navigate]);

  const handleDrillDownEquipamento = useCallback((equipamentoId) => {
    if (!equipamentoId) return;

    goToRoute('/manutencoes', {
      filtroEquipamentoId: equipamentoId,
      filtroTipoInicial: 'Corretiva',
    });
  }, [goToRoute]);

  const handleGoToAtivos = useCallback(() => {
    goToRoute('/equipamentos');
  }, [goToRoute]);

  const handleGoToPreventivas = useCallback(() => {
    goToRoute('/manutencoes', {
      filtroTipoInicial: 'Preventiva',
    });
  }, [goToRoute]);

  const handleGoToCorretivas = useCallback(() => {
    goToRoute('/manutencoes', {
      filtroTipoInicial: 'Corretiva',
    });
  }, [goToRoute]);

  const handleGoToDowntime = useCallback(() => {
    goToRoute('/manutencoes');
  }, [goToRoute]);

  const handleGoToUnidadeCritica = useCallback(() => {
    const unidadeNome = rankingUnidades[0]?.nome;
    if (!unidadeNome) return;

    goToRoute('/equipamentos', {
      filtroUnidadeNomeInicial: unidadeNome,
    });
  }, [goToRoute, rankingUnidades]);

  return {
    handleDrillDownEquipamento,
    handleGoToAtivos,
    handleGoToPreventivas,
    handleGoToCorretivas,
    handleGoToDowntime,
    handleGoToUnidadeCritica,
  };
}