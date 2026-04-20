import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

import { EmptyState } from '@/components/ui';

function BIFrequenciaFalhasWidget({ items, onSelectEquipamento }) {
  if (!items?.length) {
    return <EmptyState message="Sem dados de corretivas." />;
  }

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="grid grid-cols-[1fr_120px] border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface-soft)',
          color: 'var(--text-muted)',
        }}
      >
        <span>Equipamento</span>
        <span className="text-center">Qtd. corretivas</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
        {items.map((equipamento, index) => (
          <button
            key={`${equipamento.tag}-${index}`}
            type="button"
            onClick={() => onSelectEquipamento(equipamento.id)}
            className="grid w-full grid-cols-[1fr_120px] items-center px-4 py-3 text-left transition"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="min-w-0">
              <div
                className="font-semibold"
                style={{ color: 'var(--brand-primary)' }}
              >
                {equipamento.modelo}
                <FontAwesomeIcon
                  icon={faExternalLinkAlt}
                  size="xs"
                  className="ml-2 opacity-60"
                />
              </div>

              <div
                className="mt-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Tag: {equipamento.tag}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-red-500">
                {equipamento.corretivas}
              </div>
              <div
                className="mt-1 text-[11px] font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                corretivas
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default BIFrequenciaFalhasWidget;
