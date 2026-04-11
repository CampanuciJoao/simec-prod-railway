import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function toChartData(data) {
  if (!Array.isArray(data) || data.length === 0) return null;

  return {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: 'Status',
        data: data.map((item) => item.value),
        borderWidth: 2,
      },
    ],
  };
}

function DonutChart({ data = [] }) {
  const chartData = toChartData(data);

  if (!chartData) {
    return (
      <p className="text-center text-slate-400 italic py-12">
        Dados inválidos para o gráfico.
      </p>
    );
  }

  return (
    <Doughnut
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
        cutout: '60%',
      }}
    />
  );
}

export default DonutChart;