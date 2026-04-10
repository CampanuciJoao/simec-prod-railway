// Ficheiro: src/components/charts/DonutChart.jsx
// VERSÃO ATUALIZADA PARA A NOVA ESTRUTURA

import React, { useRef } from 'react';
import { Doughnut, getElementAtEvent } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function getCssVariableValue(variableName) {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
  }
  return '';
}

function normalizarChartData(data) {
  if (!data) return null;

  if (data.labels && data.datasets) {
    return data;
  }

  if (Array.isArray(data)) {
    const colorsLight = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
    ];

    const colorsDark = [
      '#60a5fa',
      '#34d399',
      '#fbbf24',
      '#f87171',
      '#a78bfa',
      '#22d3ee',
    ];

    return {
      labels: data.map((item) => item.name ?? item.label ?? 'Item'),
      datasets: [
        {
          label: 'Status',
          data: data.map((item) => item.value ?? 0),
          backgroundColor: colorsLight,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
      colorsLight,
      colorsDark,
      textColorsLight: [],
      textColorsDark: [],
    };
  }

  return null;
}

function DonutChart({ data, chartData, title, darkMode = false, onSliceClick }) {
  const chartRef = useRef(null);
  const finalChartData = normalizarChartData(chartData || data);

  const handleClick = (event) => {
    if (!chartRef.current || !onSliceClick || !finalChartData) return;

    const element = getElementAtEvent(chartRef.current, event);

    if (element.length > 0) {
      const { index } = element[0];
      const label = finalChartData.labels[index];
      onSliceClick(label);
    }
  };

  const isValid =
    finalChartData &&
    Array.isArray(finalChartData.labels) &&
    finalChartData.labels.length > 0 &&
    finalChartData.datasets &&
    Array.isArray(finalChartData.datasets) &&
    finalChartData.datasets.length > 0 &&
    Array.isArray(finalChartData.datasets[0].data) &&
    finalChartData.datasets[0].data.length > 0 &&
    finalChartData.labels.length === finalChartData.datasets[0].data.length;

  if (!isValid) {
    return <p>Dados inválidos para o gráfico.</p>;
  }

  const fallbackTextColor = darkMode
    ? getCssVariableValue('--cor-texto-principal-dark') || '#e2e8f0'
    : getCssVariableValue('--cor-texto-principal-light') || '#1e293b';

  const dataset = finalChartData.datasets[0];

  const finalData = {
    labels: finalChartData.labels,
    datasets: [
      {
        ...dataset,
        label: title || dataset.label || 'Status',
        backgroundColor:
          (darkMode ? finalChartData.colorsDark : finalChartData.colorsLight) ||
          dataset.backgroundColor,
        borderColor: darkMode
          ? getCssVariableValue('--cor-fundo-card-dark') || '#0f172a'
          : getCssVariableValue('--cor-fundo-card-light') || '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    devicePixelRatio:
      typeof window !== 'undefined'
        ? Math.max(window.devicePixelRatio || 1, 1.5)
        : 1.5,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            size: 11,
            family: 'Inter, sans-serif',
            weight: '500',
          },
          color: (context) =>
            (darkMode
              ? finalChartData.textColorsDark
              : finalChartData.textColorsLight)?.[context.index] ?? fallbackTextColor,
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: darkMode
          ? 'rgba(30, 30, 30, 0.92)'
          : 'rgba(255, 255, 255, 0.92)',
        borderColor: darkMode
          ? getCssVariableValue('--cor-borda-dark') || '#334155'
          : getCssVariableValue('--cor-borda-light') || '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        titleFont: { weight: 'bold', size: 12 },
        titleColor: fallbackTextColor,
        bodyColor: fallbackTextColor,
        bodyFont: { size: 11 },
        callbacks: {
          labelColor: (context) => ({
            borderColor:
              (darkMode
                ? finalChartData.colorsDark
                : finalChartData.colorsLight)?.[context.dataIndex] ??
              'rgba(0,0,0,0.1)',
            backgroundColor:
              (darkMode
                ? finalChartData.colorsDark
                : finalChartData.colorsLight)?.[context.dataIndex] ??
              'rgba(0,0,0,0.1)',
            borderWidth: 0,
            borderRadius: 2,
          }),
          labelTextColor: (context) =>
            (darkMode
              ? finalChartData.textColorsDark
              : finalChartData.textColorsLight)?.[context.dataIndex] ??
            fallbackTextColor,
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
      <Doughnut
        ref={chartRef}
        data={finalData}
        options={options}
        onClick={handleClick}
      />
    </div>
  );
}

export default DonutChart;