import React from 'react';

import { EmptyState } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';

function BIDowntimeChartWidget({ data, expanded = false }) {
  if (!data?.length) {
    return <EmptyState message="Sem dados válidos de downtime por unidade." />;
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
        O downtime considera a duração da manutenção concluída, priorizando o
        período real da OS e, quando ele não existir, o intervalo agendado.
      </div>

      <div className={expanded ? 'h-[460px]' : 'h-[320px]'}>
        <BarChart
          data={data}
          datasetLabel="Horas paradas"
          emptyMessage="Sem dados válidos de downtime por unidade."
        />
      </div>
    </div>
  );
}

export default BIDowntimeChartWidget;
