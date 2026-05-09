import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import AreaChart from '@/components/charts/AreaChart';

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function mesLabel(mesStr) {
  const idx = parseInt(mesStr.slice(5, 7), 10) - 1;
  return MESES_PT[idx] ?? mesStr;
}

function TrendBadge({ atual, anterior }) {
  if (anterior == null || atual == null || anterior === 0) return null;
  const delta = atual - anterior;
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className="ml-1.5 text-xs font-semibold"
      style={{ color: up ? 'var(--color-danger)' : 'var(--color-success)' }}
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}

function BIEvolucaoMensalWidget({ data = [] }) {
  const { labels, series, totais, piorMes } = useMemo(() => {
    if (!data.length) return { labels: [], series: [], totais: null, piorMes: null };

    const totalPreventivas = data.reduce((a, d) => a + (d.preventivas ?? 0), 0);
    const totalCorretivas  = data.reduce((a, d) => a + (d.corretivas  ?? 0), 0);
    const totalDowntime    = data.reduce((a, d) => a + (d.downtime    ?? 0), 0);

    const pior = data.reduce((max, d) => (d.corretivas ?? 0) > (max?.corretivas ?? 0) ? d : max, null);

    const ultimo    = data[data.length - 1];
    const penultimo = data.length > 1 ? data[data.length - 2] : null;

    return {
      labels: data.map((d) => mesLabel(d.mes)),
      series: [
        { label: 'Preventivas',  data: data.map((d) => d.preventivas ?? 0), color: 'rgb(34,197,94)'  },
        { label: 'Corretivas',   data: data.map((d) => d.corretivas  ?? 0), color: 'rgb(239,68,68)'  },
        { label: 'Downtime (h)', data: data.map((d) => d.downtime    ?? 0), color: 'rgb(251,191,36)' },
      ],
      totais: {
        preventivas: totalPreventivas,
        corretivas:  totalCorretivas,
        downtime:    Math.round(totalDowntime * 10) / 10,
        ultimoCorretivas:  ultimo?.corretivas  ?? 0,
        penultimoCorretivas: penultimo?.corretivas ?? null,
        ultimoMes: mesLabel(ultimo?.mes ?? ''),
      },
      piorMes: pior && pior.corretivas > 0 ? { mes: mesLabel(pior.mes), corretivas: pior.corretivas } : null,
    };
  }, [data]);

  return (
    <div className="flex h-full flex-col gap-3">
      {totais && (
        <div className="flex flex-wrap gap-3 shrink-0">
          {[
            { label: 'Preventivas no período', value: totais.preventivas, color: 'rgb(34,197,94)',  bg: 'rgba(34,197,94,0.08)'  },
            { label: 'Corretivas no período',  value: totais.corretivas,  color: 'rgb(239,68,68)',  bg: 'rgba(239,68,68,0.08)',
              extra: <TrendBadge atual={totais.ultimoCorretivas} anterior={totais.penultimoCorretivas} /> },
            { label: 'Downtime acumulado',     value: `${totais.downtime}h`, color: 'rgb(251,191,36)', bg: 'rgba(251,191,36,0.08)' },
            ...(piorMes ? [{ label: 'Mês mais crítico', value: piorMes.mes, color: 'var(--text-secondary)', bg: 'var(--bg-surface-subtle)',
              sub: `${piorMes.corretivas} corretiva${piorMes.corretivas > 1 ? 's' : ''}` }] : []),
          ].map(({ label, value, color, bg, extra, sub }) => (
            <div
              key={label}
              className="flex flex-col rounded-xl px-3 py-2 min-w-[120px]"
              style={{ backgroundColor: bg }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <div className="flex items-baseline">
                <span className="text-lg font-bold" style={{ color }}>{value}</span>
                {extra}
              </div>
              {sub && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <AreaChart
          labels={labels}
          series={series}
          emptyMessage="Sem manutenções registradas no período."
        />
      </div>
    </div>
  );
}

BIEvolucaoMensalWidget.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      mes: PropTypes.string,
      preventivas: PropTypes.number,
      corretivas: PropTypes.number,
      downtime: PropTypes.number,
    })
  ),
};

export default BIEvolucaoMensalWidget;
