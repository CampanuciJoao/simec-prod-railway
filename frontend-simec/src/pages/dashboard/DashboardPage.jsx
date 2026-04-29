import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBell,
  faChartPie,
  faFileContract,
  faHospital,
  faRotateRight,
  faScrewdriverWrench,
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

const ResponsiveGrid = WidthProvider(Responsive);

// ─── Mini-stat ────────────────────────────────────────────────────────────────

function DashboardMiniStat({ icon, label, value, helper, tone = 'default' }) {
  const toneMap = {
    default: { iconSurface: 'var(--brand-primary-soft)', iconText: 'var(--brand-primary)' },
    success: { iconSurface: 'var(--color-success-soft)', iconText: 'var(--color-success)' },
    warning: { iconSurface: 'var(--color-warning-soft)', iconText: 'var(--color-warning)' },
    danger:  { iconSurface: 'var(--color-danger-soft)',  iconText: 'var(--color-danger)'  },
  };
  const t = toneMap[tone] || toneMap.default;

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ backgroundColor: 'var(--bg-surface-soft)', borderColor: 'var(--border-soft)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: t.iconSurface, color: t.iconText }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="mt-2 text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{helper}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

const GRAVIDADE_TONE  = { alta: 'danger', media: 'warning', baixa: 'default' };
const GRAVIDADE_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const GRAVIDADE_ORDEM = { alta: 0, media: 1, baixa: 2 };

function ordenarOcorrencias(lista) {
  return [...lista].sort((a, b) => (GRAVIDADE_ORDEM[a.gravidade] ?? 3) - (GRAVIDADE_ORDEM[b.gravidade] ?? 3));
}

function OcorrenciaPendenteItem({ ocorrencia }) {
  const tone = GRAVIDADE_TONE[ocorrencia.gravidade] || 'default';
  const toneColors = {
    danger:  { bg: 'var(--color-danger-soft)',  text: 'var(--color-danger)'  },
    warning: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)' },
    default: { bg: 'var(--bg-surface-soft)',    text: 'var(--text-muted)'    },
  };
  const colors = toneColors[tone];

  return (
    <Link
      to={`/equipamentos/ficha-tecnica/${ocorrencia.equipamento?.id}`}
      className="flex items-start gap-3 rounded-2xl border px-4 py-3 transition hover:opacity-80"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        <FontAwesomeIcon icon={faTriangleExclamation} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ocorrencia.titulo}</p>
        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
          {ocorrencia.equipamento?.modelo} · {ocorrencia.equipamento?.tag}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {GRAVIDADE_LABEL[ocorrencia.gravidade] || ocorrencia.gravidade}
      </span>
    </Link>
  );
}

// ─── Fila de atenção ──────────────────────────────────────────────────────────

function FilaAtencao({ resumo }) {
  const items = [
    {
      icon: faBell,
      label: 'Alertas ativos',
      value: resumo.alertasAtivos,
      helper: resumo.alertasCriticos > 0 ? `${resumo.alertasCriticos} em prioridade alta` : 'Nenhum alerta crítico',
      tone: resumo.alertasCriticos > 0 ? 'danger' : 'default',
    },
    {
      icon: faScrewdriverWrench,
      label: 'OS em andamento',
      value: resumo.emManutencao,
      helper: 'Ordens abertas que pressionam a disponibilidade.',
      tone: resumo.emManutencao > 0 ? 'warning' : 'default',
    },
    {
      icon: faFileContract,
      label: 'Cobertura em atenção',
      value: resumo.contratosVencendo,
      helper: 'Contratos que pedem acompanhamento de vigência.',
      tone: resumo.contratosVencendo > 0 ? 'warning' : 'default',
    },
    {
      icon: faHospital,
      label: 'Ativos restritos',
      value: resumo.inativos,
      helper: 'Equipamentos fora de operação ou em uso limitado.',
      tone: resumo.inativos > 0 ? 'danger' : 'success',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => <DashboardMiniStat key={item.label} {...item} />)}
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
          subtitle="Arraste os cards para reorganizar. Redimensione pelas bordas."
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

          {/* Fila de atenção */}
          <DashboardCard
            key="fila"
            title="Fila de atenção"
            description="Itens que ajudam a priorizar a operação."
          >
            <FilaAtencao resumo={resumo} />
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
