// src/components/BarChart.jsx
// VERSÃO 3.0 - REFINADA PARA DASHBOARD E INDICADORES BI

import React, { useEffect, useRef } from 'react';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Função para ler as cores do seu sistema (CSS Variables)
const getCssVariableValue = (variableName) => {
    if (typeof window !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }
    return '';
};

function BarChart({ chartData, title, darkMode, onBarClick }) {
  const chartRef = useRef(null);

  // Lógica de clique: Permite que ao clicar na barra, você vá para outra página (Drill-down)
  const handleClick = (event) => {
    if (!chartRef.current || !onBarClick) return;
    
    const element = getElementAtEvent(chartRef.current, event);
    
    if (element.length > 0) {
      const { datasetIndex, index } = element[0];
      const labelX = chartData.labels[index]; // Ex: Nome do mês ou Nome da Máquina
      const labelDataset = chartData.datasets[datasetIndex].label; // Ex: Tipo de Manutenção
      const valor = chartData.datasets[datasetIndex].data[index]; // O valor numérico
      
      onBarClick({ label: labelX, tipo: labelDataset, valor: valor });
    }
  };

  // Garante que os dados são válidos antes de tentar desenhar o gráfico
  const isValid = chartData &&
                  Array.isArray(chartData.labels) && chartData.labels.length > 0 &&
                  Array.isArray(chartData.datasets) && chartData.datasets.length > 0;

  if (!isValid) {
    return <p className="no-data-message" style={{ textAlign: 'center', padding: '20px' }}>Aguardando dados para o gráfico...</p>;
  }

  // Definição de cores baseada no tema (Light/Dark)
  const textColor = darkMode 
    ? (getCssVariableValue('--cor-texto-principal-dark') || '#e0e0e0') 
    : (getCssVariableValue('--cor-texto-principal-light') || '#1e293b');

  const gridColor = darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chartData.datasets.length > 1, // Só mostra legenda se houver mais de um grupo (ex: Preventiva vs Corretiva)
        position: 'bottom',
        labels: { color: textColor, font: { size: 12, weight: '500' }, usePointStyle: true, pointStyle: 'circle' }
      },
      title: {
        display: !!title,
        text: title,
        color: textColor,
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: getCssVariableValue('--cor-borda-light') || '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        stacked: true, // Mantém as barras uma sobre a outra (bom para produtividade)
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor }
      },
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
      <Bar 
        ref={chartRef} 
        data={chartData} 
        options={options} 
        onClick={handleClick} 
      />
    </div>
  );
}

export default BarChart;