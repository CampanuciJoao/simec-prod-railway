import React from 'react';
import EquipamentoCard from './EquipamentoCard';

function EquipamentosList({
  equipamentos,
  expansion,
  onGoToFichaTecnica,
  onStatusUpdated,
  onRefresh,
}) {
  return (
    <div className="flex flex-col gap-4">
      {equipamentos.map((equip) => {
        const isAberto = expansion.isExpandido(equip.id);
        const abaAtiva = expansion.getAbaAtiva(equip.id);

        return (
          <EquipamentoCard
            key={equip.id}
            equipamento={equip}
            isAberto={isAberto}
            abaAtiva={abaAtiva}
            onToggleExpandir={expansion.toggleExpandir}
            onTrocarAba={expansion.trocarAba}
            onGoToFichaTecnica={onGoToFichaTecnica}
            onStatusUpdated={onStatusUpdated}
            onRefresh={onRefresh}
          />
        );
      })}
    </div>
  );
}

export default EquipamentosList;