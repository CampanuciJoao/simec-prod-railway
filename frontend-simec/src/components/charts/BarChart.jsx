import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
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

function getThemeChartColors() {
  if (typeof window === 'undefined') {
    return {
      axis: '#64748b',
      grid: 'rgba(148, 163, 184, 0.18)',
      tooltipBg: '#0f172a',
      tooltipTitle: '#ffffff',
      tooltipBody: '#e2e8f0',
      tooltipBorder: '#1e293b',
      bar: 'rgba(59, 130, 246, 0.9)',
    };
  }

  const styles = window.getComputedStyle(document.documentElement);

  return {
    axis: styles.getPropertyValue('--text-muted').trim() || '#64748b',
    grid:
      styles.getPropertyValue('--border-soft').trim() ||
      'rgba(148, 163, 184, 0.18)',
    tooltipBg: styles.getPropertyValue('--bg-elevated').trim() || '#0f172a',
    tooltipTitle:
      styles.getPropertyValue('--text-primary').trim() || '#ffffff',
    tooltipBody:
      styles.getPropertyValue('--text-secondary').trim() || '#e2e8f0',
    tooltipBorder:
      styles.getPropertyValue('--border-default').trim() || '#1e293b',
    bar:
      styles.getPropertyValue('--brand-primary').trim() ||
      'rgba(59, 130, 246, 0.9)',
  };
}

function normalizarDados(input) {
  if (!Array.isArray(input) || input.length === 0) return null;

  const itemsValidos = input
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || '').trim(),
      value: Number(item.value || 0),
    }))
    .filter(
      (item) => item.name && Number.isFinite(item.value) && item.value >= 0
    );

  if (itemsValidos.length === 0) return null;

  return {
    labels: itemsValidos.map((item) => item.name),
    datasets: [
      {
        label: 'Manutenções',
        data: itemsValidos.map((item) => item.value),
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };
}

function EmptyChartState({ message }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm italic text-slate-400">
      {message}
    </div>
  );
}

EmptyChartState.propTypes = {
  message: PropTypes.string.isRequired,
};

function BarChart({
  data = [],
  onBarClick,
  datasetLabel = 'Manutenções',
  emptyMessage = 'Sem dados válidos para o gráfico.',
}) {
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    const normalizado = normalizarDados(data);
    const colors = getThemeChartColors();

    if (!normalizado) return null;

    return {
      ...normalizado,
      datasets: normalizado.datasets.map((dataset) => ({
        ...dataset,
        label: datasetLabel,
        backgroundColor: colors.bar,
      })),
    };
  }, [data, datasetLabel]);

  const handleClick = (event) => {
    if (!chartRef.current || !onBarClick || !chartData) return;

    const element = getElementAtEvent(chartRef.current, event);

    if (element.length > 0) {
      const { index } = element[0];
      onBarClick(data[index]);
    }
  };

  const options = useMemo(() => {
    const colors = getThemeChartColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          padding: 12,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label(context) {
              const label = context.dataset.label || '';
              const value = context.raw ?? 0;
              return `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: colors.axis,
            font: {
              size: 11,
              weight: '600',
            },
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: colors.axis,
          },
          grid: {
            color: colors.grid,
          },
        },
      },
    };
  }, []);

  if (!chartData) {
    return <EmptyChartState message={emptyMessage} />;
  }

  return (
    <Bar
      ref={chartRef}
      data={chartData}
      onClick={handleClick}
      options={options}
    />
  );
}

BarChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  onBarClick: PropTypes.func,
  datasetLabel: PropTypes.string,
  emptyMessage: PropTypes.string,
};

export default BarChart;
