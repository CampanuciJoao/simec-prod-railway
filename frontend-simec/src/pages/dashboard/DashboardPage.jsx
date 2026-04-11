import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faWrench,
  faFileContract,
  faExclamationTriangle,
  faChartPie,
  faChartColumn,
  faBell,
} from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '../../hooks/dashboard/useDashboard';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';

function SummaryCard({ icon, title, value, subtitle }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <FontAwesomeIcon icon={icon} />
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase text-slate-500">
            {title}
          </span>

          <span className="text-3xl font-extrabold text-slate-900">
            {value}
          </span>

          {subtitle && (
            <span className="text-sm text-slate-500">{subtitle}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const { data, loading, error } = useDashboard();

  const isEmpty =
    !loading &&
    !error &&
    data.totalEquipamentos === 0 &&
    data.emManutencao === 0 &&
    data.alertas.length === 0 &&
    !data.statusEquipamentos &&
    !data.manutencoesPorTipo;

  if (loading || error || isEmpty) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral do sistema"
          icon={faChartPie}
        />

        <PageState
          loading={loading}
          error={error}
          isEmpty={isEmpty}
          emptyMessage="Nenhum dado disponível."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral operacional e analítica"
        icon={faChartPie}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={faHeartbeat}
          title="Equipamentos"
          value={data.totalEquipamentos}
          subtitle="Parque total"
        />

        <SummaryCard
          icon={faWrench}
          title="Manutenções"
          value={data.emManutencao}
          subtitle="OS abertas"
        />

        <SummaryCard
          icon={faFileContract}
          title="Contratos"
          value={data.contratosVencendo}
          subtitle="Vencendo"
        />

        <SummaryCard
          icon={faBell}
          title="Alertas"
          value={data.alertasAtivos}
          subtitle="Ativos"
        />
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6">

        {/* ALERTAS */}
        <PageSection>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Alertas Recentes
              </h2>
              <p className="text-sm text-slate-500">
                Eventos críticos do sistema
              </p>
            </div>

            <Badge variant="warning">Monitoramento</Badge>
          </div>

          <div className="flex flex-col gap-3">
            {data.alertas?.length > 0 ? (
              data.alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  </div>

                  <span className="text-sm font-medium text-slate-700">
                    {alerta.titulo}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-slate-400 py-6">
                Nenhum alerta recente
              </div>
            )}
          </div>
        </PageSection>

        {/* GRÁFICOS */}
        <PageSection>
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Visão Analítica
            </h2>
            <p className="text-sm text-slate-500">
              Indicadores operacionais do sistema
            </p>
          </div>

          <div className="space-y-8">

            {/* DONUT */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <FontAwesomeIcon icon={faChartPie} />
                Status dos Equipamentos
              </h3>

              <div className="bg-slate-50 border rounded-xl p-4 h-[300px]">
                <DonutChart data={data.statusEquipamentos} />
              </div>
            </div>

            {/* BAR */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <FontAwesomeIcon icon={faChartColumn} />
                Manutenções (6 meses)
              </h3>

              <div className="bg-slate-50 border rounded-xl p-4 h-[300px]">
                <BarChart data={data.manutencoesPorTipo} />
              </div>
            </div>

          </div>
        </PageSection>

      </div>
    </PageLayout>
  );
}

export default DashboardPage;