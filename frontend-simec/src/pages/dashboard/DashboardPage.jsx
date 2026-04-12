import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faWrench,
  faFileContract,
  faBell,
  faChartPie,
  faExclamationTriangle,
  faArrowRight,
  faChartColumn,
} from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '../../hooks/dashboard/useDashboard';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';

import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';

function ActionCard({ to, icon, title, value, subtitle, tone = 'blue' }) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <Link to={to} className="block h-full">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.blue,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function AlertListItem({ alerta }) {
  const prioridadeCor =
    alerta.prioridade === 'Alta'
      ? 'bg-red-500'
      : alerta.prioridade === 'Media'
        ? 'bg-amber-400'
        : 'bg-slate-400';

  return (
    <Link
      to={alerta.link || '/alertas'}
      className="flex items-center gap-3 border-b border-slate-200 py-3 last:border-b-0 hover:bg-slate-50"
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${prioridadeCor}`} />
      <span className="line-clamp-1 text-sm text-slate-700 hover:text-blue-600">
        {alerta.titulo}
      </span>
    </Link>
  );
}

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

        {/* Cards do topo */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <ActionCard
            to="/equipamentos"
            icon={faHeartbeat}
            title="Equipamentos"
            value={data.totalEquipamentos}
            subtitle="Parque total"
            tone="emerald"
          />

          <ActionCard
            to="/manutencoes"
            icon={faWrench}
            title="Manutenções abertas"
            value={data.emManutencao}
            subtitle="Ordens em andamento"
            tone="amber"
          />

          <ActionCard
            to="/contratos"
            icon={faFileContract}
            title="Contratos vencendo"
            value={data.contratosVencendo}
            subtitle="Próximos 30 dias"
            tone="red"
          />

          <ActionCard
            to="/alertas"
            icon={faBell}
            title="Alertas ativos"
            value={data.alertasAtivos}
            subtitle="Não visualizados"
            tone="blue"
          />
        </div>

        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.2fr]">
          {/* Avisos à esquerda */}
          <PageSection className="h-full">
            <SectionHeader
              title="Últimos avisos"
              subtitle="10 alertas mais recentes do sistema"
              action={
                <Link
                  to="/alertas"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                >
                  Ver todos
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              }
            />

            {data.alertas.length > 0 ? (
              <div className="space-y-0">
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

          {/* Gráficos à direita */}
          <div className="grid grid-cols-1 gap-6">
            <PageSection>
              <SectionHeader
                title="Status dos equipamentos"
                subtitle="Distribuição atual por condição operacional"
              />
              <div className="h-[220px]">
                <DonutChart data={data.statusEquipamentos} />
              </div>
            </PageSection>

            <PageSection>
              <SectionHeader
                title="Manutenções nos últimos meses"
                subtitle="Volume total de ordens registradas no período"
              />
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