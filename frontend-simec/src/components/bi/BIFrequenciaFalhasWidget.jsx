import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

import { EmptyState } from '@/components/ui';

function BIFrequenciaFalhasWidget({ items, onSelectEquipamento }) {
  if (!items?.length) {
    return <EmptyState message="Sem dados de corretivas." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[1fr_120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Equipamento</span>
        <span className="text-center">Qtd. corretivas</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((equipamento, index) => (
          <button
            key={`${equipamento.tag}-${index}`}
            type="button"
            onClick={() => onSelectEquipamento(equipamento.id)}
            className="grid w-full grid-cols-[1fr_120px] items-center px-4 py-3 text-left transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <div className="font-semibold text-blue-700">
                {equipamento.modelo}
                <FontAwesomeIcon
                  icon={faExternalLinkAlt}
                  size="xs"
                  className="ml-2 opacity-60"
                />
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Tag: {equipamento.tag}
              </div>
            </div>

            <div className="text-center text-xl font-bold text-red-500">
              {equipamento.corretivas}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default BIFrequenciaFalhasWidget;
