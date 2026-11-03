import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { InlineEmptyState } from '@/components/ui';
import { getGehcStatus } from '@/services/api/gehcApi';
import { formatarDataHora } from '@/utils/timeUtils';

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
