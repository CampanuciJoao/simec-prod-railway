// Ficheiro: src/components/DonutChart.jsx
// VERSÃO 2.0 - LÓGICA DE CLIQUE SIMPLIFICADA

import React, { useEffect, useRef } from 'react';
import { Doughnut, getElementAtEvent } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function getCssVariableValue(variableName) {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }
  return '';
}

function DonutChart({ chartData, title, darkMode, onSliceClick }) {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartInstance = chartRef.current;
    return () => {
      if (chartInstance) chartInstance.destroy();
    };
  }, []);

  const handleClick = (event) => {
    if (!chartRef.current || !onSliceClick) return;
    const element = getElementAtEvent(chartRef.current, event);
    
    if (element.length > 0) {
      const { index } = element[0];
      const label = chartData.labels[index];
      // ========================================================================
      // >> ALTERAÇÃO FOCADA AQUI <<
      // Passa APENAS o label da fatia clicada.
      // ========================================================================
      onSliceClick(label); 
    }
  };

  const isValid = chartData && Array.isArray(chartData.labels) && chartData.labels.length > 0 &&
                  chartData.datasets && Array.isArray(chartData.datasets) && chartData.datasets.length > 0 &&
                  Array.isArray(chartData.datasets[0].data) && chartData.datasets[0].data.length > 0 &&
                  chartData.labels.length === chartData.datasets[0].data.length;

  if (!isValid) {
    console.error("DonutChart: Dados inválidos recebidos.", chartData);
    return <p>Dados inválidos para o gráfico.</p>;
  }

  const fallbackTextColor = darkMode ? getCssVariableValue('--cor-texto-principal-dark') : getCssVariableValue('--cor-texto-principal-light');

  const data = {
    labels: chartData.labels,
    datasets: [{
      label: title || 'Status',
      data: chartData.datasets[0].data,
      backgroundColor: darkMode ? chartData.colorsDark : chartData.colorsLight,
      borderColor: darkMode ? getCssVariableValue('--cor-fundo-card-dark') : getCssVariableValue('--cor-fundo-card-light'),
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };

  const options = {
    devicePixelRatio: Math.max(window.devicePixelRatio || 1, 1.5), 
    maintainAspectRatio: false, 
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 11, family: 'Inter, sans-serif', weight: '500' },
          color: (context) => (darkMode ? chartData.textColorsDark : chartData.textColorsLight)?.[context.index] ?? fallbackTextColor,
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      title: { display: false },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        borderColor: darkMode ? getCssVariableValue('--cor-borda-dark') : getCssVariableValue('--cor-borda-light'),
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        titleFont: { weight: 'bold', size: 12 },
        titleColor: fallbackTextColor, 
        bodyColor: fallbackTextColor, 
        bodyFont: { size: 11 },
        callbacks: {
            labelColor: (context) => ({
                borderColor: (darkMode ? chartData.colorsDark : chartData.colorsLight)?.[context.dataIndex] ?? 'rgba(0,0,0,0.1)',
                backgroundColor: (darkMode ? chartData.colorsDark : chartData.colorsLight)?.[context.dataIndex] ?? 'rgba(0,0,0,0.1)',
                borderWidth: 0,
                borderRadius: 2,
            }),
            labelTextColor: (context) => (darkMode ? chartData.textColorsDark : chartData.textColorsLight)?.[context.dataIndex] ?? fallbackTextColor,
        }
      }
    },
    cutout: '60%',
  };
  
  return <Doughnut ref={chartRef} data={data} options={options} onClick={handleClick} />;
}
export default DonutChart;