import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function getStatusColor(label) {
  const normalized = String(label || '').toLowerCase().replace(/\s+/g, '');

  if (normalized === 'operante') return 'rgba(16, 185, 129, 0.9)';
  if (normalized === 'inoperante') return 'rgba(239, 68, 68, 0.9)';
  if (normalized === 'emmanutencao') return 'rgba(245, 158, 11, 0.9)';
  if (normalized === 'usolimitado') return 'rgba(59, 130, 246, 0.9)';

  return 'rgba(100, 116, 139, 0.9)';
}

function normalizarDados(input) {
  if (!Array.isArray(input) || input.length === 0) return null;

  const labels = input.map((item) => item.name);
  const values = input.map((item) => item.value);
  const colors = labels.map((label) => getStatusColor(label));

  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };
}

function DonutChart({ data = [] }) {
  const chartData = useMemo(() => normalizarDados(data), [data]);

  if (!chartData) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm italic text-slate-400">
        Sem dados válidos para o gráfico.
      </div>
    );
  }

  return (
    <Doughnut
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#475569',
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 18,
              font: {
                size: 12,
                weight: '600',
              },
              generateLabels(chart) {
                const labels = chart.data.labels || [];
                const dataset = chart.data.datasets[0];
                const values = dataset?.data || [];
                const colors = dataset?.backgroundColor || [];

                return labels.map((label, index) => ({
                  text: `${label} (${values[index]})`,
                  fillStyle: colors[index],
                  strokeStyle: colors[index],
                  lineWidth: 0,
                  hidden: false,
                  index,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 12,
            borderColor: '#1e293b',
            borderWidth: 1,
          },
        },
      }}
    />
  );
}

export default DonutChart;