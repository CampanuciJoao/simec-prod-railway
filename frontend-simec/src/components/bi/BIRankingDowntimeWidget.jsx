import React from 'react';

import { EmptyState } from '@/components/ui';

function BIRankingDowntimeWidget({ items, expanded = false }) {
  if (!items?.length) {
    return <EmptyState message="Nenhum equipamento com tempo parado registrado." />;
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border px-4 py-3 text-sm"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface-soft)',
          color: 'var(--text-secondary)',
        }}
      >
        Ranking calculado a partir das OS concluídas, somando o tempo parado por
        equipamento no período.
      </div>

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
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Unidade</th>
              <th className="px-4 py-3 text-center">Tempo parado</th>
            </tr>
          </thead>

          <tbody>
            {items.map((equipamento, index) => (
              <tr
                key={`${equipamento.tag}-${index}`}
                style={{
                  borderTop:
                    index === 0 ? 'none' : '1px solid var(--border-soft)',
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
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                  {equipamento.unidade}
                </td>
                <td
                  className="px-4 py-3 text-center font-bold"
                  style={{ color: 'var(--amber-600, #d97706)' }}
                >
                  {equipamento.downtimeFormatado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BIRankingDowntimeWidget;
