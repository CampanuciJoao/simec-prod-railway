import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBell,
  faChartPie,
  faClock,
  faFileContract,
  faHeartbeat,
  faRotateRight,
  faShieldHeart,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '@/hooks/dashboard/useDashboard';
import {
  Button,
  InlineEmptyState,
  KpiCard,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
  ResponsiveGrid,
} from '@/components/ui';
import { AlertListItem } from '@/components/dashboard';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';

function DashboardMetricPill({ label, value, tone = 'default' }) {
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
    </div>
  );
}

function DashboardMiniStat({ icon, label, value, helper }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border px-4 py-4"
      style={{
        backgroundColor: 'var(--bg-surface-soft)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: 'var(--brand-primary-soft)',
          color: 'var(--brand-primary)',
        }}
      >
        <FontAwesomeIcon icon={icon} />
      </div>

      <div className="min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </p>
        <p
          className="mt-2 text-2xl font-bold leading-none"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </p>
        {helper ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {helper}
          </p>
        ) : null}
      </div>
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
      .slice(0, 3);

    return {
      totalEquipamentos,
      ativos,
      inativos,
      emManutencao,
      contratosVencendo,
      alertasAtivos,
      manutencoesPeriodo,
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
            subtitle="Acompanhe equipamentos, manutencoes e alertas em tempo real."
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
          subtitle="Leitura executiva do parque, manutencoes e alertas com foco operacional."
          icon={faChartPie}
          actions={
            <Button type="button" variant="secondary" onClick={recarregar}>
              <FontAwesomeIcon icon={faRotateRight} />
              Atualizar
            </Button>
          }
        />

        <ResponsiveGrid cols={{ base: 1, sm: 2, xl: 4 }}>
          <KpiCard
            to="/equipamentos"
            icon={faHeartbeat}
            title="Equipamentos"
            value={resumo.totalEquipamentos}
            subtitle={`${resumo.ativos} operantes no momento`}
            tone="green"
          />
          <KpiCard
            to="/manutencoes"
            icon={faWrench}
            title="Em manutencao"
            value={resumo.emManutencao}
            subtitle="Ordens em andamento no parque"
            tone="yellow"
          />
          <KpiCard
            to="/alertas"
            icon={faBell}
            title="Alertas ativos"
            value={resumo.alertasAtivos}
            subtitle={`${resumo.alertasCriticos} em prioridade alta`}
            tone="red"
          />
          <KpiCard
            to="/contratos"
            icon={faFileContract}
            title="Contratos vencendo"
            value={resumo.contratosVencendo}
            subtitle="Vigencias proximas de atencao"
            tone="blue"
          />
        </ResponsiveGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <PageSection
            title="Panorama operacional"
            description="Visao rapida do estado atual do parque e da pressao operacional."
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
              <div className="space-y-5">
                <div
                  className="rounded-3xl border p-4 md:p-5"
                  style={{
                    backgroundColor: 'var(--bg-surface-soft)',
                    borderColor: 'var(--border-soft)',
                  }}
                >
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <DashboardMetricPill
                      label="Disponibilidade"
                      value={`${resumo.disponibilidade}%`}
                      tone={resumo.disponibilidade >= 85 ? 'success' : 'warning'}
                    />
                    <DashboardMetricPill
                      label="Ativos"
                      value={resumo.ativos}
                      tone="success"
                    />
                    <DashboardMetricPill
                      label="Inativos"
                      value={resumo.inativos}
                      tone={resumo.inativos > 0 ? 'danger' : 'default'}
                    />
                    <DashboardMetricPill
                      label="Alertas criticos"
                      value={resumo.alertasCriticos}
                      tone={resumo.alertasCriticos > 0 ? 'danger' : 'info'}
                    />
                  </div>
                </div>

                <ResponsiveGrid cols={{ base: 1, md: 2 }}>
                  <DashboardMiniStat
                    icon={faClock}
                    label="Carga de manutencao recente"
                    value={resumo.manutencoesPeriodo}
                    helper="Ordens registradas no periodo observado pelo dashboard."
                  />
                  <DashboardMiniStat
                    icon={faShieldHeart}
                    label="Cobertura em atencao"
                    value={resumo.contratosVencendo}
                    helper="Contratos que pedem acompanhamento nos proximos 30 dias."
                  />
                </ResponsiveGrid>
              </div>

              <div
                className="rounded-3xl border p-4 md:p-5"
                style={{
                  backgroundColor: 'var(--bg-surface-soft)',
                  borderColor: 'var(--border-soft)',
                }}
              >
                <div className="flex h-full flex-col">
                  <div>
                    <h3
                      className="text-sm font-semibold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Leitura dominante do parque
                    </h3>
                    <p
                      className="mt-2 text-base font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Status mais representativos neste momento
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {resumo.principalStatus.length > 0 ? (
                      resumo.principalStatus.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-soft)',
                          }}
                        >
                          <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.name}
                          </span>
                          <span
                            className="text-lg font-bold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))
                    ) : (
                      <InlineEmptyState message="Sem status consolidados no momento." />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection
            title="Status dos equipamentos"
            description="Distribuicao atual por condicao operacional."
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)]">
              <div
                className="flex min-h-[280px] items-center justify-center rounded-3xl border p-3"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-soft)',
                }}
              >
                <div className="h-[240px] w-full max-w-[360px]">
                  <DonutChart data={data.statusEquipamentos} />
                </div>
              </div>

              <div className="space-y-3">
                {(data.statusEquipamentos || []).length > 0 ? (
                  data.statusEquipamentos.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        backgroundColor: 'var(--bg-surface-soft)',
                        borderColor: 'var(--border-soft)',
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="mt-2 text-2xl font-bold leading-none"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))
                ) : (
                  <InlineEmptyState message="Sem consolidacao de status disponivel." />
                )}
              </div>
            </div>
          </PageSection>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <PageSection
            title="Historico recente de manutencoes"
            description="Volume consolidado de ordens no periodo exibido pelo backend."
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
            description="Ultimos avisos do sistema com foco em acompanhamento rapido."
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
