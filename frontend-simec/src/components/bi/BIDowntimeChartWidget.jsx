import React from 'react';

import EmptyState from '@/components/ui/layout/EmptyState';
import BarChart from '@/components/charts/BarChart';

function BIDowntimeChartWidget({ data, expanded = false }) {
  if (!data?.length) {
    return <EmptyState message="Sem dados válidos para o gráfico." />;
  }

  return (
    <div className={expanded ? 'h-[460px]' : 'h-[320px]'}>
      <BarChart data={data} />
    </div>
  );
}

export default BIDowntimeChartWidget;