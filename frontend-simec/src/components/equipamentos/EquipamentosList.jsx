import React from 'react';
import EquipamentoCard from './EquipamentoCard';

function EquipamentosList({
  equipamentos = [],
  expansion,
  onGoToFichaTecnica,
  onStatusUpdated,
  onRefresh,
}) {
  if (!Array.isArray(equipamentos) || equipamentos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Nenhum equipamento disponível.
      </div>
    );
  }

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