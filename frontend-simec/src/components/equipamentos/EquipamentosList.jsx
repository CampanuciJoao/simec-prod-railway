import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';

import { EquipamentoCard } from '@/components/equipamentos';
import { EmptyState } from '@/components/ui';

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
      onGoToFichaTecnica?.(id);
    },
    [onGoToFichaTecnica]
  );

  const handleStatusUpdated = useCallback(
    (...args) => {
      onStatusUpdated?.(...args);
    },
    [onStatusUpdated]
  );

  const handleRefresh = useCallback(() => {
    onRefresh?.();
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

EquipamentosList.propTypes = {
  equipamentos: PropTypes.arrayOf(PropTypes.object),
  expansion: PropTypes.shape({
    toggleExpandir: PropTypes.func.isRequired,
    trocarAba: PropTypes.func.isRequired,
    isExpandido: PropTypes.func.isRequired,
    getAbaAtiva: PropTypes.func.isRequired,
  }).isRequired,
  onGoToFichaTecnica: PropTypes.func,
  onStatusUpdated: PropTypes.func,
  onRefresh: PropTypes.func,
};

export default memo(EquipamentosList);