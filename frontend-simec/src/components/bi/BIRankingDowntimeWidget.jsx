import React from 'react';

import { EmptyState } from '@/components/ui';

function BIRankingDowntimeWidget({ items, expanded = false }) {
  if (!items?.length) {
    return <EmptyState message="Nenhum equipamento parado registrado." />;
  }

  return (
    <div
      className={[
        'overflow-x-auto rounded-xl border',
        expanded ? 'max-h-[520px]' : '',
      ].join(' ')}
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <table className="min-w-full">
        <thead style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
          <tr
            className="text-left text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            <th className="px-4 py-3">Equipamento</th>
            <th className="px-4 py-3">Nº Série / Tag</th>
            <th className="px-4 py-3">Unidade</th>
            <th className="px-4 py-3 text-center">Total parado</th>
          </tr>
        </thead>

        <tbody>
          {items.map((equipamento, index) => (
            <tr
              key={`${equipamento.tag}-${index}`}
              style={{
                borderTop: index === 0 ? 'none' : '1px solid var(--border-soft)',
              }}
            >
              <td
                className="px-4 py-3 font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {equipamento.modelo}
              </td>
              <td
                className="px-4 py-3 font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {equipamento.tag}
              </td>
              <td
                className="px-4 py-3"
                style={{ color: 'var(--text-muted)' }}
              >
                {equipamento.unidade}
              </td>
              <td className="px-4 py-3 text-center font-bold text-amber-600">
                {equipamento.downtimeFormatado}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BIRankingDowntimeWidget;
