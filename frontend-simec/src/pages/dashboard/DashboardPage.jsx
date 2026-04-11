import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartbeat,
  faWrench,
  faFileContract,
  faBell,
  faChartPie,
  faChartColumn,
  faExclamationTriangle,
  faArrowRight,
  faScrewdriverWrench,
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

function KpiCard({ icon, title, value, subtitle, tone = 'blue' }) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <Card className="h-full">
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
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </Card>
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

function AlertItem({ alerta }) {
  const prioridadeVariant =
    alerta.prioridade === 'Alta'
      ? 'red'
      : alerta.prioridade === 'Media'
        ? 'yellow'
        : 'blue';

  return (
    <Link
      to={alerta.link || '/alertas'}
      className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium leading-6 text-slate-800">
              {alerta.titulo}
            </p>
            <Badge variant={prioridadeVariant}>{alerta.prioridade || 'Info'}</Badge>
          </div>

          {alerta.subtitulo ? (
            <p className="mt-1 text-sm text-slate-500">{alerta.subtitulo}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function EmptyPanel({ message }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function DashboardPage() {
  const { data, loading, error } = useDashboard();

  const safeData = {
    totalEquipamentos: data?.totalEquipamentos ?? data?.equipamentosCount ?? 0,
    emManutencao: data?.emManutencao ?? data?.manutencoesCount ?? 0,
    contratosVencendo: data?.contratosVencendo ?? data?.contratosVencendoCount ?? 0,
    alertasAtivos: data?.alertasAtivos ?? 0,
    alertas: data?.alertas ?? data?.alertasRecentes ?? [],
    statusEquipamentos: data?.statusEquipamentos ?? [],
    manutencoesPorTipo: data?.manutencoesPorTipo ?? data?.manutencoesPorTipoMes ?? [],
  };

  const isEmpty =
    !loading &&
    !error &&
    safeData.totalEquipamentos === 0 &&
    safeData.emManutencao === 0 &&
    safeData.contratosVencendo === 0 &&
    safeData.alertasAtivos === 0 &&
    safeData.alertas.length === 0 &&
    safeData.statusEquipamentos.length === 0 &&
    safeData.manutencoesPorTipo.length === 0;

  if (loading || error || isEmpty) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral operacional do SIMEC"
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
      <PageHeader
        title="Dashboard"
        subtitle="Acompanhe equipamentos, manutenções e alertas em tempo real"
        icon={faChartPie}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          icon={faHeartbeat}
          title="Equipamentos"
          value={safeData.totalEquipamentos}
          subtitle="Parque total"
          tone="blue"
        />

        <KpiCard
          icon={faWrench}
          title="Em manutenção"
          value={safeData.emManutencao}
          subtitle="Ordens abertas"
          tone="amber"
        />

        <KpiCard
          icon={faFileContract}
          title="Contratos vencendo"
          value={safeData.contratosVencendo}
          subtitle="Próximos 30 dias"
          tone="red"
        />

        <KpiCard
          icon={faBell}
          title="Alertas ativos"
          value={safeData.alertasAtivos}
          subtitle="Não visualizados"
          tone="emerald"
        />
      </div>

      {/* Linha analítica principal */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.25fr]">
        <PageSection className="h-full">
          <SectionHeader
            title="Status dos equipamentos"
            subtitle="Distribuição atual do parque por condição operacional"
          />

          <div className="h-[320px]">
            <DonutChart data={safeData.statusEquipamentos} />
          </div>
        </PageSection>

        <PageSection className="h-full">
          <SectionHeader
            title="Manutenções nos últimos 6 meses"
            subtitle="Acompanhe a evolução por tipo de manutenção"
          />

          <div className="h-[320px]">
            <BarChart data={safeData.manutencoesPorTipo} />
          </div>
        </PageSection>
      </div>

      {/* Linha operacional */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PageSection className="h-full">
          <SectionHeader
            title="Últimos alertas"
            subtitle="Ocorrências recentes e pontos de atenção do sistema"
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

          {safeData.alertas.length > 0 ? (
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {safeData.alertas.slice(0, 6).map((alerta) => (
                <AlertItem key={alerta.id} alerta={alerta} />
              ))}
            </div>
          ) : (
            <EmptyPanel message="Nenhum alerta recente no momento." />
          )}
        </PageSection>

        <PageSection className="h-full">
          <SectionHeader
            title="Resumo operacional"
            subtitle="Leitura rápida do estado atual do sistema"
          />

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <FontAwesomeIcon icon={faHeartbeat} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Parque monitorado
                  </p>
                  <p className="text-sm text-slate-500">
                    {safeData.totalEquipamentos} equipamento(s) cadastrados
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <FontAwesomeIcon icon={faScrewdriverWrench} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Carga de manutenção
                  </p>
                  <p className="text-sm text-slate-500">
                    {safeData.emManutencao} ordem(ns) em andamento ou pendentes
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Prioridade do dia
                  </p>
                  <p className="text-sm text-slate-500">
                    Monitore alertas ativos e contratos próximos do vencimento
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default DashboardPage;