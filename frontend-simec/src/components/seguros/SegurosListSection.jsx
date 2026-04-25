import { useState } from 'react';

import SeguroCard from './SeguroCard';

function SegurosListSection({ seguros, getStatus, actions }) {
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
          onView={() => actions.view(s.id)}
          onEdit={() => actions.edit(s.id)}
          onDelete={() => actions.delete(s)}
        />
      ))}
    </div>
  );
}

export default SegurosListSection;