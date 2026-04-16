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
} from '@/components/ui/layout';

import PageState from '@/components/ui/feedback/PageState';

import { DashboardStatCard } from '@/components/shared';
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
      <PageLayout background="slate" padded fullHeight>
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
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-5">
        <PageHeader
          title="Dashboard"
          subtitle="Acompanhe equipamentos, manutenções e alertas em tempo real"
          icon={faChartPie}
        />

        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
          <DashboardStatCard
            to="/equipamentos"
            icon={faHeartbeat}
            title="Equipamentos"
            value={data.totalEquipamentos}
            subtitle="Parque total"
            tone="emerald"
          />

          <DashboardStatCard
            to="/manutencoes"
            icon={faWrench}
            title="Manutenções abertas"
            value={data.emManutencao}
            subtitle="Ordens em andamento"
            tone="amber"
          />

          <DashboardStatCard
            to="/contratos"
            icon={faFileContract}
            title="Contratos vencendo"
            value={data.contratosVencendo}
            subtitle="Próximos 30 dias"
            tone="red"
          />

          <DashboardStatCard
            to="/alertas"
            icon={faBell}
            title="Alertas ativos"
            value={data.alertasAtivos}
            subtitle="Não visualizados"
            tone="blue"
          />
        </ResponsiveGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.2fr]">
          <PageSection
            className="h-full"
            title="Últimos avisos"
            description="10 alertas mais recentes do sistema"
            headerRight={
              <Link
                to="/alertas"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
              >
                Ver todos
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </Link>
            }
          >
            {data.alertas.length > 0 ? (
              <div>
                {data.alertas.slice(0, 10).map((alerta) => (
                  <AlertListItem key={alerta.id} alerta={alerta} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Nenhum aviso recente.
              </div>
            )}
          </PageSection>

          <div className="grid grid-cols-1 gap-6">
            <PageSection
              title="Status dos equipamentos"
              description="Distribuição atual por condição operacional"
            >
              <div className="h-[220px]">
                <DonutChart data={data.statusEquipamentos} />
              </div>
            </PageSection>

            <PageSection
              title="Manutenções nos últimos meses"
              description="Volume total de ordens registradas no período"
            >
              <div className="h-[220px]">
                <BarChart data={data.manutencoesPorTipo} />
              </div>
            </PageSection>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default DashboardPage;