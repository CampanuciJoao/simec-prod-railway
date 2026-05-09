import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import AreaChart from '@/components/charts/AreaChart';

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function mesLabel(mesStr) {
  const idx = parseInt(mesStr.slice(5, 7), 10) - 1;
  return MESES_PT[idx] ?? mesStr;
}

function BIEvolucaoMensalWidget({ data = [] }) {
  const { labels, series } = useMemo(() => {
    if (!data.length) return { labels: [], series: [] };

    return {
      labels: data.map((d) => mesLabel(d.mes)),
      series: [
        {
          label: 'Preventivas',
          data: data.map((d) => d.preventivas ?? 0),
          color: 'rgb(34, 197, 94)',
        },
        {
          label: 'Corretivas',
          data: data.map((d) => d.corretivas ?? 0),
          color: 'rgb(239, 68, 68)',
        },
        {
          label: 'Downtime (h)',
          data: data.map((d) => d.downtime ?? 0),
          color: 'rgb(251, 191, 36)',
        },
      ],
    };
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <AreaChart
          labels={labels}
          series={series}
          emptyMessage="Sem manutenções registradas no período."
        />
      </div>
    </div>
  );
}

BIEvolucaoMensalWidget.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      mes: PropTypes.string,
      preventivas: PropTypes.number,
      corretivas: PropTypes.number,
      downtime: PropTypes.number,
    })
  ),
};

export default BIEvolucaoMensalWidget;
