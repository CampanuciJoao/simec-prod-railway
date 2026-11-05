import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { InlineEmptyState } from '@/components/ui';
import { getGehcStatus, getGehcHistoricoGrafico } from '@/services/api/gehcApi';
import { formatarDataHora } from '@/utils/timeUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// Componente compartilhado: cards de saude das RMs GE. Antes vivia
// inline em DashboardPage; foi extraido pra ser reusado na aba
// Monitoramento > Saude dos Equipamentos (dashboard consolidado).
//
// Props:
//   - onLoad(info): callback quando dados carregam; recebe { total, online, offline }
//   - compact: true pra layout mais denso (dashboard); false pra layout rico (aba)

function GaugeBox({ label, value, tone = 'ok', compact = false }) {
  const tones = {
    ok:    { border: 'var(--border-default)',     bg: 'var(--bg-surface)',           color: 'var(--text-primary)' },
    good:  { border: 'var(--color-success-soft)', bg: 'var(--color-success-surface)', color: 'var(--color-success)' },
    warn:  { border: 'var(--color-warning-soft)', bg: 'var(--color-warning-surface)', color: 'var(--color-warning)' },
    crit:  { border: 'var(--color-danger)',       bg: 'var(--color-danger-surface)', color: 'var(--color-danger)' },
    muted: { border: 'var(--border-soft)',        bg: 'var(--bg-surface-soft)',      color: 'var(--text-muted)' },
  };
  const t = tones[tone] || tones.ok;
  return (
    <div
      style={{
        backgroundColor: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 6,
        padding: compact ? '5px 7px' : '8px 10px',
        minWidth: 0,
      }}
    >
      <div
        className="truncate"
        style={{
          fontSize: compact ? 10.5 : 11.5,
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? 14 : 17,
          fontWeight: 700,
          color: t.color,
          marginTop: 2,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
GaugeBox.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  tone: PropTypes.string,
  compact: PropTypes.bool,
};

// Sparkline de temperatura + pressao das ultimas 7 dias (buckets de 6h
// retornados pelo endpoint /historico/grafico). Duas linhas no mesmo
// grafico, cada uma com seu eixo Y (sem labels pra ficar enxuto).
// Tooltip mostra valor real ao passar o mouse.
function SparklineRm({ equipamentoId }) {
  const [serie, setSerie] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!equipamentoId) return;
    let ativo = true;
    setCarregando(true);
    const fim = new Date().toISOString().slice(0, 10);
    const inicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    getGehcHistoricoGrafico(equipamentoId, { inicio, fim })
      .then((d) => { if (ativo) setSerie(d); })
      .catch(() => {})
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [equipamentoId]);

  if (!equipamentoId) return null;
  if (carregando) {
    return <div style={{ height: 60, width: '100%' }} />;
  }
  const temp = serie?.temperatura || [];
  const pressao = serie?.pressao || [];
  if (temp.length < 2 && pressao.length < 2) {
    return (
      <div className="flex h-[60px] items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Sem histórico suficiente nos últimos 7 dias
      </div>
    );
  }

  // Alinha buckets por timestamp (temperatura e pressao vem em 6h)
  const buckets = Array.from(new Set([
    ...temp.map((b) => b.bucket),
    ...pressao.map((b) => b.bucket),
  ])).sort();
  const mapaTemp = new Map(temp.map((b) => [b.bucket, b.avg]));
  const mapaPressao = new Map(pressao.map((b) => [b.bucket, b.avg]));
  const labels = buckets.map((b) =>
    new Date(b).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit' })
  );
  const dadosTemp = buckets.map((b) => mapaTemp.get(b) ?? null);
  const dadosPressao = buckets.map((b) => mapaPressao.get(b) ?? null);

  return (
    <div style={{ height: 60, width: '100%' }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Temp (°C)', data: dadosTemp,
              borderColor: '#f59e0b', backgroundColor: '#f59e0b33',
              tension: 0.35, pointRadius: 0, pointHoverRadius: 3,
              borderWidth: 1.5, fill: true, yAxisID: 'y',
              spanGaps: true,
            },
            {
              label: 'Pressão (PSI)', data: dadosPressao,
              borderColor: '#3b82f6', backgroundColor: 'transparent',
              tension: 0.35, pointRadius: 0, pointHoverRadius: 3,
              borderWidth: 1.5, fill: false, yAxisID: 'y1',
              spanGaps: true,
            },
          ],
        }}
        options={{
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed.y;
                  if (val == null) return '';
                  const suf = ctx.dataset.label.includes('Temp') ? '°C' : ' PSI';
                  return `${ctx.dataset.label.split(' ')[0]}: ${val.toFixed(2)}${suf}`;
                },
              },
            },
          },
          scales: {
            x: { display: false },
            y: { display: false, position: 'left' },
            y1: { display: false, position: 'right' },
          },
          elements: { line: { borderCapStyle: 'round' } },
        }}
      />
    </div>
  );
}
SparklineRm.propTypes = { equipamentoId: PropTypes.string };

function SaudeRMsList({ onLoad, compact = false }) {
  const [snapshots, setSnapshots] = useState([]);
  const [configurado, setConfigurado] = useState(true);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCarregando(true);
    getGehcStatus()
      .then((res) => {
        if (cancelled) return;
        setConfigurado(res.credenciais?.configurado ?? false);
        const snaps = res.ultimosSnapshots ?? [];
        setSnapshots(snaps);
        if (onLoad) {
          const online = snaps.filter((s) => s.equipmentOnline === true).length;
          const offline = snaps.filter((s) => s.equipmentOnline === false).length;
          onLoad({ total: snaps.length, online, offline });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCarregando(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (carregando) return <InlineEmptyState message="Carregando saúde das RMs..." />;

  if (!configurado) {
    return (
      <InlineEmptyState message="Integração GE não configurada.">
        <Link to="/gerenciamento/integracoes" className="text-xs underline" style={{ color: 'var(--brand-primary)' }}>
          Configurar agora
        </Link>
      </InlineEmptyState>
    );
  }

  if (!snapshots.length) {
    return <InlineEmptyState message="Nenhuma captura de saúde ainda. Execute o monitor na tela de integrações." />;
  }

  return (
    <div className="space-y-2">
      {snapshots.map((s, i) => (
        <div
          key={s.equipamentoId || i}
          className="rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {s.equipamentoId ? (
              <Link
                to={`/equipamentos/detalhes/${s.equipamentoId}`}
                className="min-w-0 truncate text-[13.5px] font-semibold hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {s.equipamento}
              </Link>
            ) : (
              <p className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {s.equipamento}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-2">
              {s.equipmentOnline != null && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 3,
                    backgroundColor: s.equipmentOnline ? 'var(--color-success-surface)' : 'var(--color-danger-surface)',
                    color: s.equipmentOnline ? 'var(--color-success)' : 'var(--color-danger)',
                    border: `1px solid ${s.equipmentOnline ? 'var(--color-success-soft)' : 'var(--color-danger-soft)'}`,
                  }}
                >
                  {s.equipmentOnline ? '● Online' : '○ Offline'}
                </span>
              )}
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  color: 'var(--text-muted)',
                }}
              >
                {formatarDataHora(s.capturedAt)}
              </p>
            </div>
          </div>

          <div className={compact ? 'grid grid-cols-2 gap-1.5 sm:grid-cols-4' : 'grid gap-2 lg:grid-cols-[1fr_280px]'}>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <GaugeBox
                label="Hélio"
                value={s.heliumLevelPct != null ? `${s.heliumLevelPct}%` : '—'}
                tone={
                  s.heliumLevelPct == null ? 'muted'
                  : s.heliumLevelPct < 30 ? 'crit'
                  : s.heliumLevelPct < 70 ? 'warn'
                  : 'good'
                }
                compact={compact}
              />
              <GaugeBox
                label="Pressão"
                value={s.heliumPressurePsi != null ? `${s.heliumPressurePsi} PSI` : '—'}
                tone={s.heliumPressurePsi == null ? 'muted' : 'ok'}
                compact={compact}
              />
              <GaugeBox
                label="Compressor"
                value={s.compressorStatus || '—'}
                tone={!s.compressorStatus ? 'muted' : s.compressorStatus === 'ON' ? 'good' : 'crit'}
                compact={compact}
              />
              <GaugeBox
                label="Temperatura"
                value={s.coolantTempC != null ? `${s.coolantTempC}°C` : '—'}
                tone={s.coolantTempC == null ? 'muted' : 'ok'}
                compact={compact}
              />
            </div>

            {!compact && (
              <div
                className="flex flex-col justify-center rounded-md border px-2 py-1"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div className="mb-0.5 flex items-center justify-between text-[9.5px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Últimos 7 dias</span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      Temp
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      Pressão
                    </span>
                  </span>
                </div>
                <SparklineRm equipamentoId={s.equipamentoId} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

SaudeRMsList.propTypes = {
  onLoad: PropTypes.func,
  compact: PropTypes.bool,
};

export default SaudeRMsList;
