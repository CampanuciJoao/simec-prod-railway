import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateRight,
  faTableCells,
} from '@fortawesome/free-solid-svg-icons';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useDashboard } from '@/hooks/dashboard/useDashboard';
import {
  useDashboardLayout,
  calcItemsVisible,
  DEFAULT_LAYOUT,
  ROW_HEIGHT,
  GRID_MARGIN,
} from '@/hooks/dashboard/useDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  PageLayout,
  PageState,
  InlineEmptyState,
} from '@/components/ui';
import { AlertListItem } from '@/components/dashboard';
import DashboardCard from '@/components/dashboard/DashboardCard';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import { getGehcStatus } from '@/services/api/gehcApi';
import { formatarDataHora } from '@/utils/timeUtils';

const ResponsiveGrid = WidthProvider(Responsive);

/* ─── Header compacto ─── */

function DashboardHeader({ onReset, onReload }) {
  const agora = new Date();
  const dataStr = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      style={{ paddingTop: 4, paddingBottom: 18, borderBottom: '2px solid var(--text-primary)' }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-ink)', padding: '3px 7px', fontWeight: 800 }}>P-00</span>
          <span>{dataStr} · {horaStr}</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(32px, 3.4vw, 44px)',
            lineHeight: 1,
            letterSpacing: '-0.035em',
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            marginTop: 10,
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            marginTop: 6,
            maxWidth: 620,
          }}
        >
          Visão geral da operação, alertas e indicadores do parque de equipamentos.
        </p>
      </div>
      <div className="flex shrink-0 gap-0">
        <button
          type="button"
          onClick={onReset}
          title="Redefinir layout padrão"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '10px 16px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '2px solid var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <FontAwesomeIcon icon={faTableCells} /> Layout
        </button>
        <button
          type="button"
          onClick={onReload}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '10px 16px',
            background: 'var(--brand-accent)',
            color: 'var(--brand-accent-ink)',
            border: '2px solid var(--text-primary)',
            borderLeft: 'none',
            cursor: 'pointer',
          }}
        >
          <FontAwesomeIcon icon={faRotateRight} /> Atualizar
        </button>
      </div>
    </div>
  );
}

/* ─── KPI bloco ─── */

function KpiBlock({ index, label, value, suffix, help, tone = 'default' }) {
  const tones = {
    default: { bg: 'var(--bg-surface)',   color: 'var(--text-primary)', muted: 'var(--text-muted)',           id: 'var(--text-muted)' },
    accent:  { bg: 'var(--brand-accent)', color: 'var(--text-primary)', muted: 'rgba(10,10,10,0.7)',          id: 'rgba(10,10,10,0.7)' },
    ink:     { bg: 'var(--text-primary)', color: 'var(--text-inverse)', muted: 'rgba(239,234,225,0.72)',      id: 'rgba(239,234,225,0.62)' },
    danger:  { bg: 'var(--color-danger)', color: '#ffffff',             muted: 'rgba(255,255,255,0.85)',      id: 'rgba(255,255,255,0.75)' },
  };
  const t = tones[tone] || tones.default;

  const isZero = value === 0 || value === '0';

  return (
    <div
      style={{
        background: t.bg,
        color: t.color,
        padding: '18px 20px 20px',
        borderRight: '2px solid var(--text-primary)',
        position: 'relative',
        minHeight: 150,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: t.id,
          }}
        >
          {String(index).padStart(3, '0')}
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(44px, 4.2vw, 64px)',
          lineHeight: 0.95,
          letterSpacing: '-0.04em',
          marginTop: 10,
          opacity: isZero ? 0.5 : 1,
        }}
      >
        {value}
        {suffix && (
          <sup
            style={{
              fontSize: 16,
              fontWeight: 700,
              verticalAlign: 'top',
              marginLeft: 4,
              letterSpacing: 0,
              opacity: 0.55,
            }}
          >
            {suffix}
          </sup>
        )}
      </div>

      {help && (
        <p
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            marginTop: 10,
            color: t.muted,
            fontFamily: 'var(--font-body)',
          }}
        >
          {help}
        </p>
      )}
    </div>
  );
}

/* ─── Ocorrências ─── */

const STATUS_OS_LABEL = {
  Aberta:             'Aberta',
  EmAndamento:        'Em andamento',
  AguardandoTerceiro: 'Ag. terceiro',
  Concluida:          'Concluída',
};
const GRAVIDADE_ORDEM = { alta: 0, media: 1, baixa: 2 };

function ordenarOcorrencias(lista) {
  return [...lista].sort((a, b) => (GRAVIDADE_ORDEM[a.gravidade] ?? 3) - (GRAVIDADE_ORDEM[b.gravidade] ?? 3));
}

function OcorrenciaItem({ ocorrencia, num }) {
  const grav = ocorrencia.gravidade || 'baixa';
  const numStyles = {
    alta:  { color: 'var(--color-danger)' },
    media: {
      WebkitTextStroke: '2px var(--text-primary)',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
    },
    baixa: { color: 'var(--text-muted)' },
  };
  const badgeStyles = {
    alta:  { background: 'var(--color-danger)',  color: '#fff' },
    media: { background: 'var(--brand-accent)',  color: 'var(--brand-accent-ink)' },
    baixa: { background: 'var(--text-primary)',  color: 'var(--text-inverse)' },
  };
  return (
    <Link
      to={`/manutencoes/ocorrencia/${ocorrencia.id}`}
      className="grid grid-cols-[48px_1fr_auto] items-center gap-4 py-3.5"
      style={{ borderTop: '2px solid var(--text-primary)', textDecoration: 'none' }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          ...numStyles[grav],
        }}
      >
        {String(num).padStart(2, '0')}
      </div>
      <div className="min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          {ocorrencia.titulo}
        </p>
        <p
          className="mt-1 truncate"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {ocorrencia.equipamento?.modelo} · {ocorrencia.equipamento?.tag}
        </p>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '5px 8px',
          whiteSpace: 'nowrap',
          ...badgeStyles[grav],
        }}
      >
        {STATUS_OS_LABEL[ocorrencia.gravidade] || ocorrencia.gravidade}
      </span>
    </Link>
  );
}

/* ─── Saúde das RMs GE ─── */

function GaugeBox({ label, value, tone = 'ok' }) {
  const styles = {
    ok:   { background: 'var(--bg-surface)',   border: '2px solid var(--text-primary)', color: 'var(--text-primary)' },
    warn: { background: 'var(--brand-accent)', border: '2px solid var(--text-primary)', color: 'var(--text-primary)' },
    crit: { background: 'var(--color-danger)', border: '2px solid var(--color-danger)', color: '#fff' },
  };
  return (
    <div style={{ ...styles[tone], padding: '7px 9px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.75 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginTop: 2, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function SaudeRMs() {
  const [snapshots, setSnapshots] = useState([]);
  const [configurado, setConfigurado] = useState(true);

  useEffect(() => {
    getGehcStatus()
      .then((res) => {
        setConfigurado(res.credenciais?.configurado ?? false);
        setSnapshots(res.ultimosSnapshots ?? []);
      })
      .catch(() => {});
  }, []);

  if (!configurado) {
    return (
      <InlineEmptyState message="Integração GE não configurada.">
        <Link to="/gerenciamento/integracoes" style={{ color: 'var(--text-primary)', fontWeight: 700, borderBottom: '3px solid var(--brand-accent)' }} className="text-xs uppercase tracking-wider">
          Configurar agora
        </Link>
      </InlineEmptyState>
    );
  }

  if (!snapshots.length) {
    return <InlineEmptyState message="Nenhuma captura de saúde ainda. Execute o monitor na tela de integrações." />;
  }

  return (
    <div className="overflow-auto">
      {snapshots.map((s, i) => (
        <div key={i} className="py-3.5" style={{ borderTop: '2px solid var(--text-primary)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {s.equipamentoId ? (
              <Link
                to={`/equipamentos/detalhes/${s.equipamentoId}`}
                className="min-w-0 truncate"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                {s.equipamento}
              </Link>
            ) : (
              <p className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                {s.equipamento}
              </p>
            )}
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
              {formatarDataHora(s.capturedAt)}
            </p>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {s.heliumLevelPct != null && (
              <GaugeBox label="He" value={`${s.heliumLevelPct}%`} tone={s.heliumLevelPct < 30 ? 'crit' : s.heliumLevelPct < 70 ? 'warn' : 'ok'} />
            )}
            {s.heliumPressurePsi != null && (
              <GaugeBox label="PSI" value={s.heliumPressurePsi} tone="ok" />
            )}
            {s.compressorStatus && (
              <GaugeBox label="Comp" value={s.compressorStatus} tone={s.compressorStatus === 'ON' ? 'ok' : 'crit'} />
            )}
            {s.coolantTempC != null && (
              <GaugeBox label="Temp" value={`${s.coolantTempC}°`} tone="ok" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── DashboardPage ─── */

function DashboardPage() {
  const { data, loading, error, recarregar } = useDashboard();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { layout, onLayoutChange, resetLayout } = useDashboardLayout(usuario?.id);

  const resumo = useMemo(() => {
    const totalEquipamentos = Number(data.totalEquipamentos || 0);
    const ativos            = Number(data.ativos || 0);
    const inativos          = Number(data.inativos || 0);
    const emManutencao      = Number(data.emManutencao || 0);
    const contratosVencendo = Number(data.contratosVencendo || 0);
    const alertasAtivos     = Number(data.alertasAtivos || 0);
    const alertasCriticos   = (data.alertas || []).filter((a) => a?.prioridade === 'Alta').length;
    const disponibilidade   = totalEquipamentos > 0 ? Math.round((ativos / totalEquipamentos) * 100) : 0;
    return { totalEquipamentos, ativos, inativos, emManutencao, contratosVencendo, alertasAtivos, alertasCriticos, disponibilidade };
  }, [data]);

  const isEmpty =
    !loading && !error &&
    resumo.totalEquipamentos === 0 && resumo.emManutencao === 0 &&
    resumo.contratosVencendo === 0 && resumo.alertasAtivos === 0 &&
    (data.alertas || []).length === 0 && (data.statusEquipamentos || []).length === 0;

  if (loading || error || isEmpty) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <DashboardHeader onReset={resetLayout} onReload={recarregar} />
          <PageState loading={loading} error={error} isEmpty={isEmpty} emptyMessage="Nenhum dado disponível no momento." />
        </div>
      </PageLayout>
    );
  }

  function getH(id) {
    return (layout.find((l) => l.i === id) || DEFAULT_LAYOUT.find((l) => l.i === id))?.h ?? 5;
  }

  const alertasVisiveis     = calcItemsVisible(getH('alertas'),     56, 0);
  const ocorrenciasVisiveis = calcItemsVisible(getH('ocorrencias'), 72, 0);
  const ocorrenciasOrdenadas = ordenarOcorrencias(data.ocorrenciasPendentes || []);

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-4">

        <div className="content-fade-in">
          <DashboardHeader onReset={resetLayout} onReload={recarregar} />
        </div>

        {/* KPI STRIP — protagonistas, logo abaixo do header */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 bh-reveal"
          style={{
            border: '2px solid var(--text-primary)',
            animationDelay: '80ms',
          }}
        >
          <KpiBlock
            index={1}
            label="Parque ativo"
            value={resumo.ativos}
            suffix={resumo.totalEquipamentos > 0 ? `/${resumo.totalEquipamentos}` : null}
            help={
              resumo.totalEquipamentos > 0
                ? `Disponibilidade efetiva em ${resumo.disponibilidade}%.`
                : 'Sem equipamentos cadastrados.'
            }
            tone="default"
          />
          <KpiBlock
            index={2}
            label="Em manutenção"
            value={resumo.emManutencao}
            help="Equipamentos com OS aberta ou em curso."
            tone="accent"
          />
          <KpiBlock
            index={3}
            label="Alertas críticos"
            value={resumo.alertasCriticos}
            help="Prioridade alta sinalizada pelo sistema."
            tone="ink"
          />
          <KpiBlock
            index={4}
            label="Contratos vencendo"
            value={resumo.contratosVencendo}
            help="Próximos 60 dias — janela curta de renegociação."
            tone="danger"
          />
        </div>

        {/* GRID DE CARDS */}
        <div className="bh-reveal" style={{ animationDelay: '160ms' }}>
          <ResponsiveGrid
            layouts={{ lg: layout, md: layout, sm: layout }}
            breakpoints={{ lg: 1100, md: 768, sm: 0 }}
            cols={{ lg: 12, md: 12, sm: 1 }}
            rowHeight={ROW_HEIGHT}
            margin={GRID_MARGIN}
            draggableHandle=".drag-handle"
            onLayoutChange={(_current, allLayouts) => onLayoutChange(allLayouts.lg || layout)}
            resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
            className="layout"
          >
            <DashboardCard
              key="ocorrencias"
              id="P-01 · ocorrências"
              title="Ocorrências pendentes"
              description="Registros abertos que exigem ação operacional."
              headerRight={
                ocorrenciasOrdenadas.length > 0 ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      background: 'var(--color-danger)',
                      color: '#fff',
                      padding: '5px 9px',
                    }}
                  >
                    ● {ocorrenciasOrdenadas.length} abertas
                  </span>
                ) : null
              }
            >
              {ocorrenciasOrdenadas.length > 0 ? (
                <div>
                  {ocorrenciasOrdenadas.slice(0, ocorrenciasVisiveis).map((oc, idx) => (
                    <OcorrenciaItem key={oc.id} ocorrencia={oc} num={idx + 1} />
                  ))}
                  <div style={{ borderTop: '2px solid var(--text-primary)' }} />
                  {ocorrenciasOrdenadas.length > ocorrenciasVisiveis && (
                    <p className="pt-3 text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      e mais{' '}
                      <strong style={{ color: 'var(--color-danger)' }}>
                        {ocorrenciasOrdenadas.length - ocorrenciasVisiveis}
                      </strong>{' '}
                      ocorrência(s) — aumente o card.
                    </p>
                  )}
                </div>
              ) : (
                <InlineEmptyState message="Nenhuma ocorrência pendente. Parque sem registros em aberto." />
              )}
            </DashboardCard>

            <DashboardCard
              key="alertas"
              id="P-02 · alertas"
              title="Alertas recentes"
              description="Avisos mais recentes do sistema."
              headerRight={
                <Link
                  to="/alertas"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--brand-accent)',
                    textDecoration: 'none',
                    borderBottom: '2px solid var(--brand-accent)',
                    paddingBottom: 1,
                  }}
                >
                  Ver todos →
                </Link>
              }
            >
              {(data.alertas || []).length > 0 ? (
                <div>
                  {data.alertas.slice(0, alertasVisiveis).map((alerta) => (
                    <AlertListItem key={alerta.id} alerta={alerta} />
                  ))}
                  {data.alertas.length > alertasVisiveis && (
                    <p className="pt-2 text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      e mais{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {data.alertas.length - alertasVisiveis}
                      </strong>{' '}
                      alerta(s).
                    </p>
                  )}
                </div>
              ) : (
                <InlineEmptyState message="Nenhum alerta recente." />
              )}
            </DashboardCard>

            <DashboardCard
              key="fila"
              id="P-03 · GEHC"
              title="Saúde das RMs GE"
              description="Último snapshot de hélio, pressão, compressor e temperatura."
              headerRight={
                <Link
                  to="/gerenciamento/integracoes"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--brand-accent)',
                    textDecoration: 'none',
                  }}
                >
                  Integrações →
                </Link>
              }
            >
              <SaudeRMs />
            </DashboardCard>

            <DashboardCard
              key="parque"
              id="P-04 · parque"
              title="Leitura do parque"
              description="Distribuição atual por status operacional."
            >
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <div className="h-[240px] w-full max-w-[340px]">
                  <DonutChart
                    data={data.statusEquipamentos}
                    onClickSegment={(label) => navigate('/equipamentos', { state: { filtroStatus: label } })}
                  />
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              key="historico"
              id="P-05 · histórico"
              title="Histórico de manutenções"
              description="Volume consolidado por período."
            >
              <div className="h-full min-h-[200px]">
                <BarChart
                  data={data.manutencoesPorTipo}
                  datasetLabel="Ordens"
                  emptyMessage="Sem manutenções consolidadas para o período."
                />
              </div>
            </DashboardCard>
          </ResponsiveGrid>
        </div>

      </div>
    </PageLayout>
  );
}

export default DashboardPage;
