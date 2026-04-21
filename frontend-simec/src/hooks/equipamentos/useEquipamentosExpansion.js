import { useState, useCallback } from 'react';

export function useEquipamentosExpansion(defaultTab = 'cadastro') {
  const [expandidos, setExpandidos] = useState({});
  const [abasAtivas, setAbasAtivas] = useState({});

  const toggleExpandir = useCallback((equipamentoId) => {
    setExpandidos((prev) => ({
      ...prev,
      [equipamentoId]: !prev[equipamentoId],
    }));

    setAbasAtivas((prev) => ({
      ...prev,
      [equipamentoId]: prev[equipamentoId] || defaultTab,
    }));
  }, [defaultTab]);

  const trocarAba = useCallback((equipamentoId, nomeAba) => {
    setAbasAtivas((prev) => ({
      ...prev,
      [equipamentoId]: nomeAba,
    }));
  }, []);

  const abrirNaAba = useCallback(
    (equipamentoId, nomeAba) => {
      setExpandidos((prev) => ({
        ...prev,
        [equipamentoId]: true,
      }));

      setAbasAtivas((prev) => ({
        ...prev,
        [equipamentoId]: nomeAba,
      }));
    },
    []
  );

  const isExpandido = useCallback(
    (equipamentoId) => !!expandidos[equipamentoId],
    [expandidos]
  );

  const getAbaAtiva = useCallback(
    (equipamentoId) => abasAtivas[equipamentoId] || defaultTab,
    [abasAtivas, defaultTab]
  );

  const recolherTodos = useCallback(() => {
    setExpandidos({});
    setAbasAtivas({});
  }, []);

  return {
    toggleExpandir,
    trocarAba,
    abrirNaAba,
    isExpandido,
    getAbaAtiva,
    recolherTodos,
    expandidos,
    abasAtivas,
  };
}
