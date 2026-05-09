import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function getThemeColors() {
  if (typeof window === 'undefined') {
    return {
      axis: '#64748b',
      grid: 'rgba(148,163,184,0.18)',
      tooltipBg: '#0f172a',
      tooltipTitle: '#ffffff',
      tooltipBody: '#e2e8f0',
      tooltipBorder: '#1e293b',
    };
  }
  const s = window.getComputedStyle(document.documentElement);
  return {
    axis: s.getPropertyValue('--text-muted').trim() || '#64748b',
    grid: s.getPropertyValue('--border-soft').trim() || 'rgba(148,163,184,0.18)',
    tooltipBg: s.getPropertyValue('--bg-elevated').trim() || '#0f172a',
    tooltipTitle: s.getPropertyValue('--text-primary').trim() || '#ffffff',
    tooltipBody: s.getPropertyValue('--text-secondary').trim() || '#e2e8f0',
    tooltipBorder: s.getPropertyValue('--border-default').trim() || '#1e293b',
  };
}

// series: [{ label, data: number[], color: string }]
function AreaChart({ labels = [], series = [], emptyMessage = 'Sem dados para exibir.' }) {
  const hasData = labels.length > 0 && series.some((s) => s.data.some((v) => v > 0));

  const chartData = useMemo(() => ({
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: s.color.replace(')', ', 0.15)').replace('rgb', 'rgba'),
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: s.color,
    })),
  }), [labels, series]);

  const options = useMemo(() => {
    const c = getThemeColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: c.axis,
            boxWidth: 12,
            boxHeight: 12,
            padding: 16,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.tooltipTitle,
          bodyColor: c.tooltipBody,
          borderColor: c.tooltipBorder,
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: c.axis, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: c.axis },
          grid: { color: c.grid },
        },
      },
    };
  }, []);

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-sm italic text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return <Line data={chartData} options={options} />;
}

AreaChart.propTypes = {
  labels: PropTypes.arrayOf(PropTypes.string),
  series: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(PropTypes.number).isRequired,
      color: PropTypes.string.isRequired,
    })
  ),
  emptyMessage: PropTypes.string,
};

export default AreaChart;
