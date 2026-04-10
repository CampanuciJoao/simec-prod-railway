import React, { useRef } from 'react';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function toChartData(data) {
  if (!Array.isArray(data) || data.length === 0) return null;

  return {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: 'Quantidade',
        data: data.map((item) => item.value),
        borderRadius: 8,
      },
    ],
  };
}

function BarChart({ data = [], onBarClick }) {
  const chartRef = useRef(null);
  const chartData = toChartData(data);

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
      <p className="text-center text-slate-400 italic py-12">
        Aguardando dados para o gráfico...
      </p>
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
        },
      }}
    />
  );
}

export default BarChart;