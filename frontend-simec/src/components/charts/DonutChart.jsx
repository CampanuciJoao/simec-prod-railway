import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function getThemeChartColors() {
  if (typeof window === 'undefined') {
    return {
      legend: '#475569',
      tooltipBg: '#0f172a',
      tooltipTitle: '#ffffff',
      tooltipBody: '#e2e8f0',
      tooltipBorder: '#1e293b',
      border: '#ffffff',
    };
  }

  const styles = window.getComputedStyle(document.documentElement);

  return {
    legend: styles.getPropertyValue('--text-muted').trim() || '#475569',
    tooltipBg: styles.getPropertyValue('--bg-elevated').trim() || '#0f172a',
    tooltipTitle:
      styles.getPropertyValue('--text-primary').trim() || '#ffffff',
    tooltipBody:
      styles.getPropertyValue('--text-secondary').trim() || '#e2e8f0',
    tooltipBorder:
      styles.getPropertyValue('--border-default').trim() || '#1e293b',
    border: styles.getPropertyValue('--bg-surface').trim() || '#ffffff',
  };
}

function getStatusColor(label) {
  const normalized = String(label || '')
    .toLowerCase()
    .replace(/\s+/g, '');

  if (normalized === 'operante') return 'rgba(16, 185, 129, 0.9)';
  if (normalized === 'inoperante') return 'rgba(239, 68, 68, 0.9)';
  if (normalized === 'emmanutencao') return 'rgba(245, 158, 11, 0.9)';
  if (normalized === 'usolimitado') return 'rgba(59, 130, 246, 0.9)';

  return 'rgba(100, 116, 139, 0.9)';
}

function normalizarDados(input) {
  if (!Array.isArray(input) || input.length === 0) return null;

  const itemsValidos = input
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || '').trim(),
      value: Number(item.value || 0),
    }))
    .filter((item) => item.name && Number.isFinite(item.value) && item.value >= 0);

  if (itemsValidos.length === 0) return null;

  const labels = itemsValidos.map((item) => item.name);
  const values = itemsValidos.map((item) => item.value);
  const colors = labels.map((label) => getStatusColor(label));
  const themeColors = getThemeChartColors();

  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: themeColors.border,
        borderWidth: 3,
        hoverOffset: 6,
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

function DonutChart({ data = [], emptyMessage = 'Sem dados válidos para o gráfico.' }) {
  const chartData = useMemo(() => normalizarDados(data), [data]);

  const options = useMemo(() => {
    const colors = getThemeChartColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.legend,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18,
            boxWidth: 10,
            font: {
              size: 12,
              weight: '600',
            },
            generateLabels(chart) {
              const labels = chart.data.labels || [];
              const dataset = chart.data.datasets?.[0];
              const values = dataset?.data || [];
              const datasetColors = dataset?.backgroundColor || [];

              return labels.map((label, index) => ({
                text: `${label} (${values[index] ?? 0})`,
                fillStyle: datasetColors[index],
                strokeStyle: datasetColors[index],
                lineWidth: 0,
                hidden: false,
                index,
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          padding: 12,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
        },
      },
    };
  }, []);

  if (!chartData) {
    return <EmptyChartState message={emptyMessage} />;
  }

  return <Doughnut data={chartData} options={options} />;
}

DonutChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  emptyMessage: PropTypes.string,
};

export default DonutChart;
