import React, { useMemo, useRef } from 'react';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function normalizarDados(input) {
  if (!Array.isArray(input) || input.length === 0) return null;

  return {
    labels: input.map((item) => item.name),
    datasets: [
      {
        label: 'Manutenções',
        data: input.map((item) => item.value),
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };
}

function BarChart({ data = [], onBarClick }) {
  const chartRef = useRef(null);
  const chartData = useMemo(() => normalizarDados(data), [data]);

  const handleClick = (event) => {
    if (!chartRef.current || !onBarClick || !chartData) return;

    const element = getElementAtEvent(chartRef.current, event);
    if (element.length > 0) {
      const { index } = element[0];
      onBarClick(data[index]);
    }
  };

  if (!chartData) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm italic text-slate-400">
        Sem dados válidos para o gráfico.
      </div>
    );
  }

  return (
    <Bar
      ref={chartRef}
      data={chartData}
      onClick={handleClick}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 12,
            borderColor: '#1e293b',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: {
                size: 11,
                weight: '600',
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#64748b',
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.18)',
            },
          },
        },
      }}
    />
  );
}

export default BarChart;