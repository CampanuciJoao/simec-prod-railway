import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faChartPie,
  faHeartPulse,
  faRotateRight,
  faTriangleExclamation,
  faTableCells,
  faMicrochip,
  faWrench,
  faFileContract,
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
  Button,
  InlineEmptyState,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';
import { AlertListItem } from '@/components/dashboard';
import DashboardCard from '@/components/dashboard/DashboardCard';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import { getGehcStatus } from '@/services/api/gehcApi';
import { formatarDataHora } from '@/utils/timeUtils';

const ResponsiveGrid = WidthProvider(Responsive);

// ─── Mini-stat ────────────────────────────────────────────────────────────────

/**
 * Mini-stat tech-industrial:
 * - Borda superior 1px colorida por tone (faixa de identidade)
 * - ID monospace (K01-K04) no canto superior direito
 * - Eyebrow uppercase tracking + valor grande em mono tabular
 * - Ícone num quadrado tonal compacto
 * - Helper text muted
 */
function DashboardMiniStat({ icon, label, value, helper, tone = 'default', code }) {
  const toneMap = {
    default: { accent: 'var(--brand-primary)', iconSurface: 'var(--brand-primary-soft)', iconText: 'var(--brand-primary)' },
    success: { accent: 'var(--color-success)', iconSurface: 'var(--color-success-soft)', iconText: 'var(--color-success)' },
    warning: { accent: 'var(--color-warning)', iconSurface: 'var(--color-warning-soft)', iconText: 'var(--color-warning)' },
    danger:  { accent: 'var(--color-danger)',  iconSurface: 'var(--color-danger-soft)',  iconText: 'var(--color-danger)'  },
  };
  const t = toneMap[tone] || toneMap.default;

  return (
    <div
      className="relative rounded-xl border px-3.5 py-3 overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: 'var(--bg-surface-soft)',
        borderColor: 'var(--border-soft)',
      }}
    >
      {/* faixa colorida superior — sinaliza a categoria sem pesar */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
          opacity: 0.7,
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ backgroundColor: t.iconSurface, color: t.iconText }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {label}
            </p>
            {code && (
              <span
                className="text-[9.5px] font-bold"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.18em',
                  color: 'var(--text-muted)',
                  opacity: 0.7,
                }}
              >
                {code}
              </span>
            )}
          </div>
          <p
            className="stat-value mt-0.5 text-2xl font-semibold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>{helper}</p>
    </div>
  );
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

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

/**
 * Item de ocorrência tech-industrial:
 * - Barra lateral colorida de 4px (sev) à esquerda — leitura imediata
 * - Tag monospace uppercase compacta (CRIT/HIGH/MED/INFO)
 * - Layout em grid com TAG do equipamento separada
 */
const GRAV_LABEL = {
  alta:  'CRIT',
  media: 'HIGH',
  baixa: 'MED',
};

function OcorrenciaPendenteItem({ ocorrencia }) {
  const tone = STATUS_OS_TONE[ocorrencia.gravidade] || 'default';
  const toneColors = {
    danger:  { bg: 'var(--color-danger-soft)',  text: 'var(--color-danger)',   bar: 'var(--color-danger)'   },
    warning: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)',  bar: 'var(--color-warning)'  },
    info:    { bg: 'var(--brand-primary-soft)', text: 'var(--brand-primary)',  bar: 'var(--brand-primary)'  },
    success: { bg: 'var(--color-success-soft)', text: 'var(--color-success)',  bar: 'var(--color-success)'  },
    default: { bg: 'var(--bg-surface-soft)',    text: 'var(--text-muted)',     bar: 'var(--border-strong)'  },
  };
  const colors = toneColors[tone];
  const gravUpper = GRAV_LABEL[ocorrencia.gravidade] || (STATUS_OS_LABEL[ocorrencia.gravidade] || ocorrencia.gravidade || '').toUpperCase();

  return (
    <Link
      to={`/manutencoes/ocorrencia/${ocorrencia.id}`}
      className="group relative flex items-stretch gap-3 rounded-xl border pl-3 pr-3 py-2.5 transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      {/* Barra lateral de severidade — 4px, cor sólida */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0, top: 8, bottom: 8,
          width: 3,
          backgroundColor: colors.bar,
          borderRadius: '0 2px 2px 0',
        }}
      />

      <div className="min-w-0 flex-1 pl-2">
        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {ocorrencia.titulo}
        </p>
        <p
          className="mt-0.5 truncate"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
          }}
        >
          {ocorrencia.equipamento?.modelo}
          {ocorrencia.equipamento?.tag ? ` · TAG ${ocorrencia.equipamento.tag}` : ''}
        </p>
      </div>

      <span
        className="shrink-0 self-center inline-flex items-center"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          padding: '4px 7px',
          borderRadius: 4,
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.text}`,
          textTransform: 'uppercase',
        }}
      >
        {gravUpper}
      </span>
    </Link>
  );
}

// ─── Saúde das RMs GE ─────────────────────────────────────────────────────────

/**
 * Gauge box visual — He / PSI / COMP / TEMP em quadrados coloridos
 * por estado. Substitui a leitura inline de texto plano.
 */
function GaugeBox({ label, value, tone = 'ok' }) {
  const tones = {
    ok:   { border: 'var(--border-default)',     bg: 'var(--bg-surface)',          color: 'var(--text-primary)' },
    good: { border: 'var(--color-success-soft)', bg: 'var(--color-success-surface)', color: 'var(--color-success)' },
    warn: { border: 'var(--color-warning-soft)', bg: 'var(--color-warning-surface)', color: 'var(--color-warning)' },
    crit: { border: 'var(--color-danger)',       bg: 'var(--color-danger-surface)', color: 'var(--color-danger)' },
  };
  const t = tones[tone] || tones.ok;
  return (
    <div
      style={{
        backgroundColor: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 6,
        padding: '6px 8px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        className="stat-value"
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: t.color,
          marginTop: 1,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
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
    <div className="space-y-2.5 overflow-auto">
      {snapshots.map((s, i) => (
        <div
          key={i}
          className="rounded-xl border px-3.5 py-3"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {s.equipamentoId ? (
              <Link
                to={`/equipamentos/detalhes/${s.equipamentoId}`}
                className="text-sm font-semibold truncate min-w-0 hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {s.equipamento}
              </Link>
            ) : (
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.equipamento}</p>
            )}
            <div className="flex items-center gap-2">
              {s.equipmentOnline !== null && s.equipmentOnline !== undefined && (
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

          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {s.heliumLevelPct != null && (
              <GaugeBox
                label="He"
                value={`${s.heliumLevelPct}%`}
                tone={
                  s.heliumLevelPct < 30 ? 'crit'
                  : s.heliumLevelPct < 70 ? 'warn'
                  : 'good'
                }
              />
            )}
            {s.heliumPressurePsi != null && (
              <GaugeBox
                label="PSI"
                value={s.heliumPressurePsi}
                tone="ok"
              />
            )}
            {s.compressorStatus && (
              <GaugeBox
                label="Comp"
                value={s.compressorStatus}
                tone={s.compressorStatus === 'ON' ? 'good' : 'crit'}
              />
            )}
            {s.coolantTempC != null && (
              <GaugeBox
                label="Temp"
                value={`${s.coolantTempC}°`}
                tone="ok"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

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
          <PageHeader
            title="Dashboard"
            subtitle="Resumo operacional do parque, manutenções e alertas."
            icon={faChartPie}
            actions={
              <Button type="button" variant="secondary" onClick={recarregar}>
                <FontAwesomeIcon icon={faRotateRight} /> Atualizar
              </Button>
            }
          />
          <PageState loading={loading} error={error} isEmpty={isEmpty} emptyMessage="Nenhum dado disponível." />
        </div>
      </PageLayout>
    );
  }

  function getH(id) {
    return (layout.find((l) => l.i === id) || DEFAULT_LAYOUT.find((l) => l.i === id))?.h ?? 5;
  }

  const alertasVisiveis     = calcItemsVisible(getH('alertas'),     56, 0);
  const ocorrenciasVisiveis = calcItemsVisible(getH('ocorrencias'), 64, 0);
  const ocorrenciasOrdenadas = ordenarOcorrencias(data.ocorrenciasPendentes || []);

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-4">
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral da operação, alertas e indicadores do parque de equipamentos."
          icon={faChartPie}
          actions={
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={resetLayout} title="Redefinir layout padrão">
                <FontAwesomeIcon icon={faTableCells} /> Redefinir layout
              </Button>
              <Button type="button" variant="secondary" onClick={recarregar}>
                <FontAwesomeIcon icon={faRotateRight} /> Atualizar
              </Button>
            </div>
          }
        />

        {/* KPI ribbon — 4 indicadores operacionais antes do grid configurável */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DashboardMiniStat
            code="K01"
            icon={faMicrochip}
            label="Parque ativo"
            value={
              <>
                {resumo.ativos}
                {resumo.totalEquipamentos > 0 && (
                  <span style={{ fontSize: '0.5em', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
                    /{resumo.totalEquipamentos}
                  </span>
                )}
              </>
            }
            helper={
              resumo.totalEquipamentos > 0
                ? `${resumo.disponibilidade}% disponibilidade efetiva`
                : 'Sem equipamentos cadastrados'
            }
            tone="default"
          />
          <DashboardMiniStat
            code="K02"
            icon={faWrench}
            label="Em manutenção"
            value={resumo.emManutencao}
            helper="Equipamentos com OS aberta ou em curso"
            tone="warning"
          />
          <DashboardMiniStat
            code="K03"
            icon={faTriangleExclamation}
            label="Alertas críticos"
            value={resumo.alertasCriticos}
            helper="Prioridade alta sinalizada pelo sistema"
            tone="danger"
          />
          <DashboardMiniStat
            code="K04"
            icon={faFileContract}
            label="Contratos vencendo"
            value={resumo.contratosVencendo}
            helper="Próximos 60 dias — janela de renegociação"
            tone="default"
          />
        </div>

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
            title="Ocorrências pendentes"
            description="Registros abertos que precisam de atenção."
            headerRight={
              ocorrenciasOrdenadas.length > 0 ? (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
                >
                  {ocorrenciasOrdenadas.length} abertas
                </span>
              ) : null
            }
          >
            {ocorrenciasOrdenadas.length > 0 ? (
              <div className="space-y-2">
                {ocorrenciasOrdenadas.slice(0, ocorrenciasVisiveis).map((oc) => (
                  <OcorrenciaPendenteItem key={oc.id} ocorrencia={oc} />
                ))}
                {ocorrenciasOrdenadas.length > ocorrenciasVisiveis && (
                  <p className="pt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    e mais{' '}
                    <strong style={{ color: 'var(--color-danger)' }}>
                      {ocorrenciasOrdenadas.length - ocorrenciasVisiveis}
                    </strong>{' '}
                    ocorrência(s) — aumente o card para ver mais.
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
            title="Alertas recentes"
            description="Avisos mais recentes do sistema."
            headerRight={
              <Link
                to="/alertas"
                className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver todos <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </Link>
            }
          >
            {(data.alertas || []).length > 0 ? (
              <div className="space-y-3">
                {data.alertas.slice(0, alertasVisiveis).map((alerta) => (
                  <AlertListItem key={alerta.id} alerta={alerta} />
                ))}
                {data.alertas.length > alertasVisiveis && (
                  <p className="pt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    e mais{' '}
                    <strong style={{ color: 'var(--brand-primary)' }}>
                      {data.alertas.length - alertasVisiveis}
                    </strong>{' '}
                    alerta(s) — aumente o card para ver mais.
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
            title="Saúde das RMs GE"
            description="Último snapshot de hélio, pressão e compressor."
            headerRight={
              <Link to="/gerenciamento/integracoes" style={{ color: 'var(--brand-primary)' }} className="text-xs">
                <FontAwesomeIcon icon={faHeartPulse} className="mr-1" />Ver integrações
              </Link>
            }
          >
            <SaudeRMs />
          </DashboardCard>

          {/* Leitura do parque */}
          <DashboardCard
            key="parque"
            title="Leitura do parque"
            description="Distribuição atual por status operacional."
          >
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <div className="h-[220px] w-full max-w-[320px]">
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
    </PageLayout>
  );
}

export default DashboardPage;
