import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS = {
  operante: '#10b981',
  inoperante: '#ef4444',
  emmanutencao: '#f59e0b',
  usolimitado: '#3b82f6',
};

function getStatusColor(label) {
  const key = String(label || '').toLowerCase().replace(/\s+/g, '');
  return STATUS_COLORS[key] || '#64748b';
}

function getThemeColors() {
  if (typeof window === 'undefined') {
    return {
      legend: '#64748b',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
      tooltipBg: '#1e293b',
      tooltipTitle: '#f8fafc',
      tooltipBody: '#cbd5e1',
      tooltipBorder: '#334155',
    };
  }

  const s = window.getComputedStyle(document.documentElement);
  const get = (v) => s.getPropertyValue(v).trim();

  return {
    legend: get('--text-muted') || '#64748b',
    textPrimary: get('--text-primary') || '#0f172a',
    textMuted: get('--text-muted') || '#64748b',
    tooltipBg: get('--bg-elevated') || '#1e293b',
    tooltipTitle: get('--text-primary') || '#f8fafc',
    tooltipBody: get('--text-secondary') || '#cbd5e1',
    tooltipBorder: get('--border-default') || '#334155',
  };
}

const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    const { ctx, data, chartArea } = chart;
    if (!chartArea) return;

    const total = (data.datasets?.[0]?.data || []).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
    if (!total) return;

    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    const colors = getThemeColors();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textPrimary;
    ctx.fillText(String(total), cx, cy - 9);

    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.fillText('equipamentos', cx, cy + 13);

    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

function normalizarDados(input) {
  if (!Array.isArray(input) || input.length === 0) return null;

  const itens = input
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || '').trim(),
      value: Number(item.value || 0),
    }))
    .filter((item) => item.name && Number.isFinite(item.value) && item.value >= 0);

  if (!itens.length) return null;

  return {
    labels: itens.map((i) => i.name),
    values: itens.map((i) => i.value),
    colors: itens.map((i) => getStatusColor(i.name)),
  };
}

function EmptyChartState({ message }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm italic text-slate-400">
      {message}
    </div>
  );
}

function DonutChart({ data = [], emptyMessage = 'Sem dados válidos para o gráfico.' }) {
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const obs = new MutationObserver(() => setThemeKey((k) => k + 1));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => obs.disconnect();
  }, []);

  const normalized = useMemo(() => normalizarDados(data), [data]);

  const chartData = useMemo(() => {
    if (!normalized) return null;
    return {
      labels: normalized.labels,
      datasets: [
        {
          data: normalized.values,
          backgroundColor: normalized.colors,
          borderWidth: 0,
          hoverOffset: 5,
        },
      ],
    };
  }, [normalized]);

  const options = useMemo(() => {
    const colors = getThemeColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 4,
          right: 8,
          bottom: 4,
          left: 8,
        },
      },
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.legend,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18,
            boxWidth: 10,
            boxHeight: 10,
            font: { size: 12, weight: '600' },
            generateLabels(chart) {
              const labels = chart.data.labels || [];
              const dataset = chart.data.datasets?.[0];
              const values = dataset?.data || [];
              const bgColors = dataset?.backgroundColor || [];

              return labels.map((label, i) => ({
                text: `${label}  ${values[i] ?? 0}`,
                fillStyle: bgColors[i],
                strokeStyle: 'transparent',
                fontColor: colors.legend,
                lineWidth: 0,
                hidden: false,
                index: i,
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          padding: 10,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label(ctx) {
              const total = (ctx.dataset.data || []).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
              return `  ${ctx.parsed} equipamentos (${pct}%)`;
            },
          },
        },
      },
    };
  }, [themeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!chartData) {
    return <EmptyChartState message={emptyMessage} />;
  }

  return <Doughnut key={themeKey} data={chartData} options={options} />;
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
