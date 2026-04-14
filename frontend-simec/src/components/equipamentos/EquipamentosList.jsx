import React, { useCallback } from 'react';
import EquipamentoCard from './EquipamentoCard';
import { EmptyState } from '../ui/layout';

function EquipamentosList({
  equipamentos = [],
  expansion,
  onGoToFichaTecnica,
  onStatusUpdated,
  onRefresh,
}) {
  const handleToggleExpandir = useCallback(
    (id) => {
      expansion.toggleExpandir(id);
    },
    [expansion]
  );

  const handleTrocarAba = useCallback(
    (id, aba) => {
      expansion.trocarAba(id, aba);
    },
    [expansion]
  );

  const handleGoToFichaTecnica = useCallback(
    (id) => {
      if (typeof onGoToFichaTecnica === 'function') {
        onGoToFichaTecnica(id);
      }
    },
    [onGoToFichaTecnica]
  );

  const handleStatusUpdated = useCallback(() => {
    if (typeof onStatusUpdated === 'function') {
      onStatusUpdated();
    }
  }, [onStatusUpdated]);

  const handleRefresh = useCallback(() => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  }, [onRefresh]);

  if (!Array.isArray(equipamentos) || equipamentos.length === 0) {
    return <EmptyState message="Nenhum equipamento disponível." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {equipamentos.map((equipamento) => {
        const isAberto = expansion.isExpandido(equipamento.id);
        const abaAtiva = expansion.getAbaAtiva(equipamento.id);

        return (
          <EquipamentoCard
            key={equipamento.id}
            equipamento={equipamento}
            isAberto={isAberto}
            abaAtiva={abaAtiva}
            onToggleExpandir={handleToggleExpandir}
            onTrocarAba={handleTrocarAba}
            onGoToFichaTecnica={handleGoToFichaTecnica}
            onStatusUpdated={handleStatusUpdated}
            onRefresh={handleRefresh}
          />
        );
      })}
    </div>
  );
}

export default React.memo(EquipamentosList);