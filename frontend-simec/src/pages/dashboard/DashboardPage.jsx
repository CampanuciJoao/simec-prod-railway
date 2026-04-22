import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBell,
  faChartPie,
  faFileContract,
  faHospital,
  faRotateRight,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '@/hooks/dashboard/useDashboard';
import {
  Button,
  InlineEmptyState,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';
import { AlertListItem } from '@/components/dashboard';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';

function DashboardMiniStat({ icon, label, value, helper, tone = 'default' }) {
  const toneMap = {
    default: {
      iconSurface: 'var(--brand-primary-soft)',
      iconText: 'var(--brand-primary)',
    },
    success: {
      iconSurface: 'var(--color-success-soft)',
      iconText: 'var(--color-success)',
    },
    warning: {
      iconSurface: 'var(--color-warning-soft)',
      iconText: 'var(--color-warning)',
    },
    danger: {
      iconSurface: 'var(--color-danger-soft)',
      iconText: 'var(--color-danger)',
    },
  };

  const resolvedTone = toneMap[tone] || toneMap.default;

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        backgroundColor: 'var(--bg-surface-soft)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: resolvedTone.iconSurface,
            color: resolvedTone.iconText,
          }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardMetricPill({ label, value, helper, tone = 'default' }) {
  const toneMap = {
    default: {
      bg: 'var(--bg-surface-subtle)',
      border: 'var(--border-soft)',
      text: 'var(--text-primary)',
      value: 'var(--text-primary)',
    },
    success: {
      bg: 'var(--color-success-soft)',
      border: 'transparent',
      text: 'var(--color-success)',
      value: 'var(--color-success)',
    },
    warning: {
      bg: 'var(--color-warning-soft)',
      border: 'transparent',
      text: 'var(--color-warning)',
      value: 'var(--color-warning)',
    },
    danger: {
      bg: 'var(--color-danger-soft)',
      border: 'transparent',
      text: 'var(--color-danger)',
      value: 'var(--color-danger)',
    },
    info: {
      bg: 'var(--brand-primary-soft)',
      border: 'transparent',
      text: 'var(--brand-primary)',
      value: 'var(--brand-primary)',
    },
  };

  const resolvedTone = toneMap[tone] || toneMap.default;

  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: resolvedTone.bg,
        borderColor: resolvedTone.border,
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: resolvedTone.text }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-xl font-bold leading-none"
        style={{ color: resolvedTone.value }}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6" style={{ color: resolvedTone.text }}>
        {helper}
      </p>
    </div>
  );
}

function DashboardStatusList({ items = [] }) {
  if (!items.length) {
    return <InlineEmptyState message="Sem consolidacao de status disponivel." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-soft)',
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.name}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {item.value === 1 ? '1 equipamento' : `${item.value} equipamentos`}
            </p>
          </div>
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardActionQueue({ resumo }) {
  const items = [
    {
      icon: faBell,
      label: 'Alertas ativos',
      value: resumo.alertasAtivos,
      helper:
        resumo.alertasCriticos > 0
          ? `${resumo.alertasCriticos} em prioridade alta`
          : 'Nenhum alerta critico no momento',
      tone: resumo.alertasCriticos > 0 ? 'danger' : 'default',
    },
    {
      icon: faScrewdriverWrench,
      label: 'OS em andamento',
      value: resumo.emManutencao,
      helper: 'Ordens abertas que pressionam a disponibilidade do parque.',
      tone: resumo.emManutencao > 0 ? 'warning' : 'default',
    },
    {
      icon: faFileContract,
      label: 'Cobertura em atencao',
      value: resumo.contratosVencendo,
      helper: 'Contratos que pedem acompanhamento de vigencia.',
      tone: resumo.contratosVencendo > 0 ? 'warning' : 'default',
    },
    {
      icon: faHospital,
      label: 'Ativos restritos',
      value: resumo.inativos,
      helper: 'Equipamentos fora de operacao ou em uso limitado.',
      tone: resumo.inativos > 0 ? 'danger' : 'success',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <DashboardMiniStat key={item.label} {...item} />
      ))}
    </div>
  );
}

function DashboardPage() {
  const { data, loading, error, recarregar } = useDashboard();

  const resumo = useMemo(() => {
    const totalEquipamentos = Number(data.totalEquipamentos || 0);
    const ativos = Number(data.ativos || 0);
    const inativos = Number(data.inativos || 0);
    const emManutencao = Number(data.emManutencao || 0);
    const contratosVencendo = Number(data.contratosVencendo || 0);
    const alertasAtivos = Number(data.alertasAtivos || 0);
    const manutencoesPeriodo = (data.manutencoesPorTipo || []).reduce(
      (total, item) => total + Number(item?.value || 0),
      0
    );
    const alertasCriticos = (data.alertas || []).filter(
      (item) => item?.prioridade === 'Alta'
    ).length;
    const disponibilidade =
      totalEquipamentos > 0
        ? Math.round((ativos / totalEquipamentos) * 100)
        : 0;
    const principalStatus = [...(data.statusEquipamentos || [])]
      .sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0))
      .slice(0, 4);
    const manutencaoMedia =
      data.manutencoesPorTipo?.length > 0
        ? Math.round(manutencoesPeriodo / data.manutencoesPorTipo.length)
        : 0;

    return {
      totalEquipamentos,
      ativos,
      inativos,
      emManutencao,
      contratosVencendo,
      alertasAtivos,
      manutencoesPeriodo,
      manutencaoMedia,
      alertasCriticos,
      disponibilidade,
      principalStatus,
    };
  }, [data]);

  const isEmpty =
    !loading &&
    !error &&
    resumo.totalEquipamentos === 0 &&
    resumo.emManutencao === 0 &&
    resumo.contratosVencendo === 0 &&
    resumo.alertasAtivos === 0 &&
    (data.alertas || []).length === 0 &&
    (data.statusEquipamentos || []).length === 0 &&
    (data.manutencoesPorTipo || []).length === 0;

  if (loading || error || isEmpty) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title="Dashboard"
            subtitle="Resumo operacional do parque, manutencoes e alertas."
            icon={faChartPie}
            actions={
              <Button type="button" variant="secondary" onClick={recarregar}>
                <FontAwesomeIcon icon={faRotateRight} />
                Atualizar
              </Button>
            }
          />

          <PageState
            loading={loading}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="Nenhum dado disponivel para o dashboard."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Dashboard"
          subtitle="Leitura rapida do que exige atencao operacional agora."
          icon={faChartPie}
          actions={
            <Button type="button" variant="secondary" onClick={recarregar}>
              <FontAwesomeIcon icon={faRotateRight} />
              Atualizar
            </Button>
          }
        />

        <PageSection
          title="Resumo executivo"
          description="Leituras-chave para orientar a proxima acao da equipe."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricPill
              label="Ativos operantes"
              value={resumo.ativos}
              helper="Equipamentos disponiveis para operacao."
              tone="success"
            />
            <DashboardMetricPill
              label="Intervencoes abertas"
              value={resumo.emManutencao}
              helper="Ordens que ainda exigem acompanhamento."
              tone={resumo.emManutencao > 0 ? 'warning' : 'default'}
            />
            <DashboardMetricPill
              label="Contratos em atencao"
              value={resumo.contratosVencendo}
              helper="Coberturas proximas do vencimento."
              tone={resumo.contratosVencendo > 0 ? 'warning' : 'default'}
            />
            <DashboardMetricPill
              label="Alertas criticos"
              value={resumo.alertasCriticos}
              helper="Casos que merecem priorizacao imediata."
              tone={resumo.alertasCriticos > 0 ? 'danger' : 'info'}
            />
          </div>
        </PageSection>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <PageSection
            title="Fila de atencao"
            description="Itens que ajudam a priorizar a operacao sem repetir o mesmo indicador em varios cards."
          >
            <DashboardActionQueue resumo={resumo} />
          </PageSection>

          <PageSection
            title="Leitura do parque"
            description="Distribuicao atual por status operacional e peso relativo no momento."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
              <div
                className="flex min-h-[260px] items-center justify-center rounded-3xl border p-4"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-soft)',
                }}
              >
                <div className="h-[220px] w-full max-w-[280px]">
                  <DonutChart data={data.statusEquipamentos} />
                </div>
              </div>

              <DashboardStatusList items={resumo.principalStatus} />
            </div>
          </PageSection>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <PageSection
            title="Historico de manutencoes"
            description="Volume consolidado por periodo para leitura de tendencia e pressao operacional."
          >
            <div
              className="rounded-3xl border p-3 sm:p-4"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-soft)',
              }}
            >
              <div className="h-[280px] sm:h-[320px]">
                <BarChart
                  data={data.manutencoesPorTipo}
                  datasetLabel="Ordens"
                  emptyMessage="Sem manutencoes consolidadas para o periodo."
                />
              </div>
            </div>
          </PageSection>

          <PageSection
            title="Alertas recentes"
            description="Acompanhamento rapido dos avisos mais recentes do sistema."
            headerRight={
              <Link
                to="/alertas"
                className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver todos
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </Link>
            }
          >
            {(data.alertas || []).length > 0 ? (
              <div className="space-y-3">
                {data.alertas.slice(0, 8).map((alerta) => (
                  <AlertListItem key={alerta.id} alerta={alerta} />
                ))}
              </div>
            ) : (
              <InlineEmptyState message="Nenhum alerta recente para acompanhamento." />
            )}
          </PageSection>
        </div>

      </div>
    </PageLayout>
  );
}

export default DashboardPage;
