// src/components/charts/BarChart.jsx
// VERSÃO ATUALIZADA PARA A NOVA ESTRUTURA

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

const getCssVariableValue = (variableName) => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
  }
  return '';
};

function normalizarChartData(data) {
  if (!data) return null;

  if (data.labels && data.datasets) {
    return data;
  }

  if (Array.isArray(data)) {
    return {
      labels: data.map((item) => item.name ?? item.label ?? 'Item'),
      datasets: [
        {
          label: 'Quantidade',
          data: data.map((item) => item.value ?? 0),
          backgroundColor: getCssVariableValue('--cor-primaria-light') || '#3b82f6',
          borderRadius: 8,
        },
      ],
    };
  }

  return null;
}

function BarChart({ data, chartData, title, darkMode = false, onBarClick }) {
  const chartRef = useRef(null);
  const finalChartData = normalizarChartData(chartData || data);

  const handleClick = (event) => {
    if (!chartRef.current || !onBarClick || !finalChartData) return;

    const element = getElementAtEvent(chartRef.current, event);

    if (element.length > 0) {
      const { datasetIndex, index } = element[0];
      const labelX = finalChartData.labels[index];
      const labelDataset = finalChartData.datasets?.[datasetIndex]?.label;
      const valor = finalChartData.datasets?.[datasetIndex]?.data?.[index];

      onBarClick({
        label: labelX,
        tipo: labelDataset,
        valor,
      });
    }
  };

  const isValid =
    finalChartData &&
    Array.isArray(finalChartData.labels) &&
    finalChartData.labels.length > 0 &&
    Array.isArray(finalChartData.datasets) &&
    finalChartData.datasets.length > 0;

  if (!isValid) {
    return (
      <p
        className="no-data-message"
        style={{ textAlign: 'center', padding: '20px' }}
      >
        Aguardando dados para o gráfico...
      </p>
    );
  }

  const textColor = darkMode
    ? getCssVariableValue('--cor-texto-principal-dark') || '#e2e8f0'
    : getCssVariableValue('--cor-texto-principal-light') || '#1e293b';

  const gridColor = darkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: finalChartData.datasets.length > 1,
        position: 'bottom',
        labels: {
          color: textColor,
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: !!title,
        text: title,
        color: textColor,
        font: { size: 14, weight: 'bold' },
      },
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: getCssVariableValue('--cor-borda-light') || '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor },
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
      <Bar
        ref={chartRef}
        data={finalChartData}
        options={options}
        onClick={handleClick}
      />
    </div>
  );
}

export default BarChart;