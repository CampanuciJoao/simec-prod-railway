import { useState } from 'react';

import SeguroCard from './SeguroCard';

function SegurosListSection({ seguros, getStatus, actions, isAdmin }) {
  const [expandedId, setExpandedId] = useState(null);

  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="grid gap-4">
      {seguros.map((s) => (
        <SeguroCard
          key={s.id}
          seguro={s}
          status={getStatus(s)}
          isExpanded={expandedId === s.id}
          onToggle={handleToggle}
          onEdit={() => actions.edit(s.id)}
          onRenovar={() => actions.renovar?.(s.id)}
          onCancelar={(motivo) => actions.cancelar(s.id, motivo)}
          onExcluir={() => actions.excluir(s.id)}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

export default SegurosListSection;