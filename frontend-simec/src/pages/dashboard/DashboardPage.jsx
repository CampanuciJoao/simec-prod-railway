import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faRotateRight,
  faTriangleExclamation,
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

/* ─── Botões locais bauhaus ─── */

function BhButton({ children, variant = 'default', onClick, title }) {
  const base = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: '10px 16px',
    border: '2px solid var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 160ms cubic-bezier(.18,.7,.2,1)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };
  const palettes = {
    default: { background: 'transparent', color: 'var(--text-primary)' },
    accent: { background: 'var(--brand-accent)', borderColor: 'var(--text-primary)', color: 'var(--text-primary)' },
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{ ...base, ...palettes[variant] }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(-2px, -2px)';
        e.currentTarget.style.boxShadow = '4px 4px 0 var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}

/* ─── KPI bloco bauhaus ─── */

function KpiBlock({ index, label, value, suffix, help, tone = 'default' }) {
  const tones = {
    default: { bg: 'var(--bg-surface)',   color: 'var(--text-primary)', muted: 'var(--text-muted)', id: 'var(--text-muted)' },
    accent:  { bg: 'var(--brand-accent)', color: 'var(--text-primary)', muted: 'rgba(10,10,10,0.7)', id: 'rgba(10,10,10,0.7)' },
    ink:     { bg: 'var(--text-primary)', color: 'var(--text-inverse)', muted: 'rgba(239,234,225,0.72)', id: 'rgba(239,234,225,0.62)' },
    danger:  { bg: 'var(--color-danger)', color: '#ffffff', muted: 'rgba(255,255,255,0.85)', id: 'rgba(255,255,255,0.75)' },
  };
  const t = tones[tone] || tones.default;

  return (
    <div
      style={{
        background: t.bg,
        color: t.color,
        padding: '24px 22px 26px',
        borderRight: '2px solid var(--text-primary)',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: t.id,
        }}
      >
        {String(index).padStart(3, '0')}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(56px, 5.6vw, 84px)',
          lineHeight: 0.9,
          letterSpacing: '-0.05em',
          marginTop: 14,
        }}
      >
        {value}
        {suffix && (
          <sup
            style={{
              fontSize: 20,
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
            fontSize: 13,
            lineHeight: 1.4,
            marginTop: 12,
            color: t.muted,
            fontFamily: 'var(--font-body)',
            maxWidth: 260,
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
const STATUS_OS_TONE = {
  Aberta:             'warning',
  EmAndamento:        'info',
  AguardandoTerceiro: 'warning',
  Concluida:          'success',
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
  const tone = STATUS_OS_TONE[ocorrencia.gravidade] || 'default';
  return (
    <Link
      to={`/manutencoes/ocorrencia/${ocorrencia.id}`}
      className="grid grid-cols-[60px_1fr_auto] items-center gap-4 py-4"
      style={{ borderTop: '2px solid var(--text-primary)', textDecoration: 'none' }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 38,
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
            fontSize: 16,
            lineHeight: 1.2,
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
            fontSize: 10.5,
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
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '6px 10px',
          whiteSpace: 'nowrap',
          ...badgeStyles[grav],
        }}
        title={tone}
      >
        {STATUS_OS_LABEL[ocorrencia.gravidade] || ocorrencia.gravidade}
      </span>
    </Link>
  );
}

/* ─── Saúde das RMs GE ─── */

function GaugeBox({ label, value, tone = 'ok' }) {
  const styles = {
    ok:   { background: 'var(--bg-surface)',     border: '2px solid var(--text-primary)', color: 'var(--text-primary)' },
    warn: { background: 'var(--brand-accent)',   border: '2px solid var(--text-primary)', color: 'var(--text-primary)' },
    crit: { background: 'var(--color-danger)',   border: '2px solid var(--color-danger)', color: '#fff' },
  };
  return (
    <div style={{ ...styles[tone], padding: '8px 10px' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          opacity: 0.75,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 20,
          marginTop: 2,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
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
        <div key={i} className="py-4" style={{ borderTop: '2px solid var(--text-primary)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {s.equipamentoId ? (
              <Link
                to={`/equipamentos/detalhes/${s.equipamentoId}`}
                className="min-w-0 truncate"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                {s.equipamento}
              </Link>
            ) : (
              <p
                className="truncate"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                }}
              >
                {s.equipamento}
              </p>
            )}
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
              {formatarDataHora(s.capturedAt)}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {s.heliumLevelPct != null && (
              <GaugeBox
                label="He"
                value={`${s.heliumLevelPct}%`}
                tone={s.heliumLevelPct < 30 ? 'crit' : s.heliumLevelPct < 70 ? 'warn' : 'ok'}
              />
            )}
            {s.heliumPressurePsi != null && (
              <GaugeBox label="PSI" value={s.heliumPressurePsi} tone="ok" />
            )}
            {s.compressorStatus && (
              <GaugeBox
                label="Comp"
                value={s.compressorStatus}
                tone={s.compressorStatus === 'ON' ? 'ok' : 'crit'}
              />
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

  // ── Headline editorial bauhaus
  const headline = useMemo(() => {
    const criticos = resumo.alertasCriticos;
    const total    = resumo.totalEquipamentos;
    const ativos   = resumo.ativos;
    return { criticos, total, ativos };
  }, [resumo]);

  if (loading || error || isEmpty) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <BauhausHeader resumo={resumo} onReset={resetLayout} onReload={recarregar} />
          <PageState loading={loading} error={error} isEmpty={isEmpty} emptyMessage="Nenhum dado disponível no momento." />
        </div>
      </PageLayout>
    );
  }

  function getH(id) {
    return (layout.find((l) => l.i === id) || DEFAULT_LAYOUT.find((l) => l.i === id))?.h ?? 5;
  }

  const alertasVisiveis     = calcItemsVisible(getH('alertas'),     56, 0);
  const ocorrenciasVisiveis = calcItemsVisible(getH('ocorrencias'), 88, 0);
  const ocorrenciasOrdenadas = ordenarOcorrencias(data.ocorrenciasPendentes || []);

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-0">

        {/* HEADLINE */}
        <BauhausHeader resumo={resumo} headline={headline} onReset={resetLayout} onReload={recarregar} />

        {/* KPI STRIP */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 bh-reveal"
          style={{
            borderTop: '4px solid var(--text-primary)',
            borderBottom: '4px solid var(--text-primary)',
            animationDelay: '120ms',
          }}
        >
          <KpiBlock
            index={1}
            label="Parque ativo"
            value={resumo.ativos}
            suffix={`/${resumo.totalEquipamentos}`}
            help={`Disponibilidade efetiva em ${resumo.disponibilidade}% — leitura do parque sob gestão.`}
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
        <div className="bh-reveal" style={{ animationDelay: '240ms' }}>
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
            {/* Ocorrências pendentes */}
            <DashboardCard
              key="ocorrencias"
              id="P-01 · ocorrências"
              title="Ocorrências pendentes"
              description="Registros abertos que exigem ação operacional hoje."
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
                    <p
                      className="pt-3 text-center"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                      }}
                    >
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

            {/* Alertas recentes */}
            <DashboardCard
              key="alertas"
              id="P-02 · alertas"
              title="Alertas recentes"
              description="Avisos mais recentes do sistema, em ordem cronológica."
              headerRight={
                <Link
                  to="/alertas"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--brand-accent)',
                    textDecoration: 'none',
                    borderBottom: '3px solid var(--brand-accent)',
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
                    <p
                      className="pt-2 text-center"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                      }}
                    >
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

            {/* Saúde das RMs GE */}
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

            {/* Leitura do parque */}
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

            {/* Histórico de manutenções */}
            <DashboardCard
              key="historico"
              id="P-05 · histórico"
              title="Histórico de manutenções"
              description="Volume consolidado por período — corretivas e preventivas."
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

/* ─── Header bauhaus (manchete + topbar de ações) ─── */

function BauhausHeader({ resumo, headline, onReset, onReload }) {
  const criticos = headline?.criticos ?? resumo.alertasCriticos;
  const total    = headline?.total    ?? resumo.totalEquipamentos;
  const agora    = new Date();
  const dataStr  = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const horaStr  = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Numero por extenso curto
  const porExtenso = (n) => {
    const map = {
      0: 'zero', 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro',
      5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove',
      10: 'dez',
    };
    return map[n] ?? String(n);
  };

  return (
    <div className="bh-reveal" style={{ animationDelay: '40ms' }}>
      {/* Faixa preta de ações/ribbon */}
      <div
        className="flex flex-wrap items-center gap-6 px-6 py-3"
        style={{ background: 'var(--text-primary)', color: 'var(--text-inverse)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ width: 16, height: 16, background: 'var(--brand-accent)', position: 'relative', display: 'inline-block' }}>
            <span style={{ position: 'absolute', width: 8, height: 8, background: 'var(--color-danger)', left: 4, top: 4 }} />
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: '-0.04em',
            }}
          >
            SIMEC
          </span>
        </div>
        <div
          className="hidden md:flex flex-1 items-center gap-6"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(239,234,225,0.7)',
          }}
        >
          <span>EDIÇÃO <strong style={{ color: 'var(--brand-accent)' }}>{dataStr}</strong></span>
          <span>TURNO <strong style={{ color: 'var(--brand-accent)' }}>{horaStr}</strong></span>
          <span>PARQUE <strong style={{ color: 'var(--brand-accent)' }}>{total}</strong></span>
        </div>
        <div className="ml-auto flex gap-0">
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
              color: 'var(--text-inverse)',
              border: '2px solid var(--text-inverse)',
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
              border: '2px solid var(--brand-accent)',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faRotateRight} /> Atualizar
          </button>
        </div>
      </div>

      {/* Manchete */}
      <div className="grid md:grid-cols-[8fr_4fr] gap-8 px-6 pt-12 pb-8" style={{ borderBottom: '4px solid var(--text-primary)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(48px, 6.6vw, 96px)',
            letterSpacing: '-0.055em',
            lineHeight: 0.9,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          <span style={{ display: 'block' }}>
            {criticos > 0 ? (
              <>
                <span>{porExtenso(criticos)} </span>
                <span style={{ color: 'var(--color-danger)' }}>{criticos === 1 ? 'crítico.' : 'críticos.'}</span>
              </>
            ) : (
              <span>Parque <span style={{ color: 'var(--color-success)' }}>estável.</span></span>
            )}
          </span>
          <span style={{ display: 'block' }}>
            <span className="bh-mark">Cento e</span> trinta e
          </span>
          <span style={{ display: 'block' }}>
            <span className="bh-stroke">dois</span>{' '}
            sob gestão.
          </span>
        </h1>
        <div style={{ borderLeft: '2px solid var(--text-primary)', paddingLeft: 22 }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '0.18em',
            color: 'var(--color-danger)',
          }}>
            N.º {String(Math.floor(agora.getTime() / 86400000) % 1000).padStart(3, '0')} · BOLETIM DIÁRIO
          </p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            marginTop: 12,
          }}>
            Síntese operacional do parque. Hoje o sistema sinaliza{' '}
            <strong className="bh-mark">{resumo.alertasAtivos} alerta(s)</strong>,{' '}
            <strong className="bh-mark">{resumo.contratosVencendo} contrato(s)</strong> próximos do vencimento, e{' '}
            <strong>{resumo.emManutencao} equipamento(s)</strong> em manutenção.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
