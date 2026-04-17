import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faWrench,
  faFileContract,
  faBell,
  faChartPie,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '@/hooks/dashboard/useDashboard';

import {
  PageLayout,
  PageHeader,
  PageSection,
  ResponsiveGrid,
  PageState,
  InlineEmptyState,
  KpiCard,
} from '@/components/ui';

import { AlertListItem } from '@/components/dashboard';

import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';

function DashboardPage() {
  const { data, loading, error } = useDashboard();

  const isEmpty =
    !loading &&
    !error &&
    data.totalEquipamentos === 0 &&
    data.emManutencao === 0 &&
    data.contratosVencendo === 0 &&
    data.alertasAtivos === 0 &&
    data.alertas.length === 0 &&
    data.statusEquipamentos.length === 0 &&
    data.manutencoesPorTipo.length === 0;

  if (loading || error || isEmpty) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title="Dashboard"
            subtitle="Acompanhe equipamentos, manutenções e alertas em tempo real"
            icon={faChartPie}
          />

          <PageState
            loading={loading}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="Nenhum dado disponível para o dashboard."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-8">
        <div className="space-y-6">
          <PageHeader
            title="Dashboard"
            subtitle="Acompanhe equipamentos, manutenções e alertas em tempo real"
            icon={faChartPie}
          />

          <ResponsiveGrid cols={{ base: 1, sm: 2, xl: 4 }}>
            <KpiCard
              to="/equipamentos"
              icon={faHeartbeat}
              title="Equipamentos"
              value={data.totalEquipamentos}
              subtitle="Parque total"
              tone="green"
            />

            <KpiCard
              to="/manutencoes"
              icon={faWrench}
              title="Manutenções abertas"
              value={data.emManutencao}
              subtitle="Ordens em andamento"
              tone="yellow"
            />

            <KpiCard
              to="/contratos"
              icon={faFileContract}
              title="Contratos vencendo"
              value={data.contratosVencendo}
              subtitle="Próximos 30 dias"
              tone="red"
            />

            <KpiCard
              to="/alertas"
              icon={faBell}
              title="Alertas ativos"
              value={data.alertasAtivos}
              subtitle="Não visualizados"
              tone="blue"
            />
          </ResponsiveGrid>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)]">
          <PageSection
            className="h-full"
            title="Últimos avisos"
            description="10 alertas mais recentes do sistema"
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
            {data.alertas.length > 0 ? (
              <div className="space-y-2">
                {data.alertas.slice(0, 10).map((alerta) => (
                  <AlertListItem key={alerta.id} alerta={alerta} />
                ))}
              </div>
            ) : (
              <InlineEmptyState message="Nenhum aviso recente." />
            )}
          </PageSection>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-1">
            <PageSection
              title="Status dos equipamentos"
              description="Distribuição atual por condição operacional"
            >
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-soft)',
                }}
              >
                <div className="h-[240px] w-full max-w-[360px]">
                  <DonutChart data={data.statusEquipamentos} />
                </div>
              </div>
            </PageSection>

            <PageSection
              title="Manutenções nos últimos meses"
              description="Volume total de ordens registradas no período"
            >
              <div
                className="rounded-2xl border p-3 sm:p-4"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-soft)',
                }}
              >
                <div className="h-[240px]">
                  <BarChart data={data.manutencoesPorTipo} />
                </div>
              </div>
            </PageSection>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default DashboardPage;