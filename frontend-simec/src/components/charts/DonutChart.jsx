import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function normalizarDados(input) {
  if (!Array.isArray(input) || input.length === 0) return null;

  return {
    labels: input.map((item) => item.name),
    datasets: [
      {
        label: 'Status',
        data: input.map((item) => item.value),
        backgroundColor: [
          'rgba(16, 185, 129, 0.9)',
          'rgba(239, 68, 68, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(59, 130, 246, 0.9)',
          'rgba(100, 116, 139, 0.9)',
        ],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };
}

function DonutChart({ data = [], chartData }) {
  const sourceData = chartData ?? data;

  const normalizedChartData = useMemo(
    () => normalizarDados(sourceData),
    [sourceData]
  );

  if (!normalizedChartData) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-center text-sm italic text-slate-400">
        Dados inválidos para o gráfico.
      </div>
    );
  }

  return (
    <Doughnut
      data={normalizedChartData}
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