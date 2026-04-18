import React from 'react';

import { EmptyState } from '@/components/ui';

function BIRankingDowntimeWidget({ items, expanded = false }) {
  if (!items?.length) {
    return <EmptyState message="Nenhum equipamento parado registrado." />;
  }

  return (
    <div
      className={[
        'overflow-x-auto rounded-xl border border-slate-200',
        expanded ? 'max-h-[520px]' : '',
      ].join(' ')}
    >
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Equipamento</th>
            <th className="px-4 py-3">Nº Série / Tag</th>
            <th className="px-4 py-3">Unidade</th>
            <th className="px-4 py-3 text-center">Total parado</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((equipamento, index) => (
            <tr key={`${equipamento.tag}-${index}`} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">
                {equipamento.modelo}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-700">
                {equipamento.tag}
              </td>
              <td className="px-4 py-3 text-slate-600">{equipamento.unidade}</td>
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
