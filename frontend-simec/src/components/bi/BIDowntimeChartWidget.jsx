import React from 'react';

import { EmptyState } from '@/components/ui';
import BarChart from '@/components/charts/BarChart';

function BIDowntimeChartWidget({ data, expanded = false }) {
  if (!data?.length) {
    return <EmptyState message="Sem dados válidos para o gráfico." />;
  }

  return (
    <div className={expanded ? 'h-[460px]' : 'h-[320px]'}>
      <BarChart
        data={data}
        datasetLabel="Horas paradas"
        emptyMessage="Sem dados válidos de downtime por unidade."
      />
    </div>
  );
}

export default BIDowntimeChartWidget;
