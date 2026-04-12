import React, { useMemo } from 'react';
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
    <Card className="h-full p-4">
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
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function normalizarListaGrafico(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (item?.name !== undefined && item?.value !== undefined) {
          return { name: String(item.name), value: Number(item.value) || 0 };
        }

        if (item?.label !== undefined && item?.value !== undefined) {
          return { name: String(item.label), value: Number(item.value) || 0 };
        }

        if (item?.tipo !== undefined && item?.quantidade !== undefined) {
          return { name: String(item.tipo), value: Number(item.quantidade) || 0 };
        }

        if (item?.status !== undefined && item?.quantidade !== undefined) {
          return { name: String(item.status), value: Number(item.quantidade) || 0 };
        }

        if (item?.mes !== undefined && item?.total !== undefined) {
          return { name: String(item.mes), value: Number(item.total) || 0 };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof input === 'object') {
    return Object.entries(input).map(([key, value]) => ({
      name: String(key),
      value: Number(value) || 0,
    }));
  }

  return [];
}

function DashboardPage() {
  const { data, loading, error } = useDashboard();

  const dashboard = useMemo(() => {
    const raw = data || {};

    return {
      totalEquipamentos: raw.totalEquipamentos ?? raw.equipamentosCount ?? 0,
      emManutencao: raw.emManutencao ?? raw.manutencoesPendentes ?? 0,
      contratosVencendo: raw.contratosVencendo ?? raw.contratosVencendoCount ?? 0,
      alertasAtivos: raw.alertasAtivos ?? raw.alertasNaoVistos ?? 0,
      alertas: Array.isArray(raw.alertas) ? raw.alertas : [],
      statusEquipamentos: normalizarListaGrafico(raw.statusEquipamentos),
      manutencoesPorTipo: normalizarListaGrafico(raw.manutencoesPorTipo),
    };
  }, [data]);

  const isEmpty =
    !loading &&
    !error &&
    dashboard.totalEquipamentos === 0 &&
    dashboard.emManutencao === 0 &&
    dashboard.contratosVencendo === 0 &&
    dashboard.alertasAtivos === 0 &&
    dashboard.alertas.length === 0 &&
    dashboard.statusEquipamentos.length === 0 &&
    dashboard.manutencoesPorTipo.length === 0;

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
    <PageLayout
      background="slate"
      padded
      fullHeight
      className="h-[calc(100vh-88px)] overflow-hidden"
    >
      <div className="flex h-full flex-col gap-5 overflow-hidden">
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
            value={dashboard.totalEquipamentos}
            subtitle="Parque total"
            tone="blue"
          />

          <KpiCard
            icon={faWrench}
            title="Em manutenção"
            value={dashboard.emManutencao}
            subtitle="Ordens abertas"
            tone="amber"
          />

          <KpiCard
            icon={faFileContract}
            title="Contratos vencendo"
            value={dashboard.contratosVencendo}
            subtitle="Próximos 30 dias"
            tone="red"
          />

          <KpiCard
            icon={faBell}
            title="Alertas ativos"
            value={dashboard.alertasAtivos}
            subtitle="Não visualizados"
            tone="emerald"
          />
        </div>

        {/* Área principal sem crescer indefinidamente */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
          {/* Coluna esquerda */}
          <div className="grid min-h-0 grid-rows-[1fr_auto] gap-6">
            <PageSection className="min-h-0 overflow-hidden">
              <SectionHeader
                title="Status dos equipamentos"
                subtitle="Distribuição atual do parque por condição operacional"
              />

              <div className="h-[260px]">
                <DonutChart data={dashboard.statusEquipamentos} />
              </div>
            </PageSection>

            <PageSection className="overflow-hidden">
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

              {dashboard.alertas.length > 0 ? (
                <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                  {dashboard.alertas.slice(0, 4).map((alerta) => (
                    <AlertItem key={alerta.id} alerta={alerta} />
                  ))}
                </div>
              ) : (
                <EmptyPanel message="Nenhum alerta recente no momento." />
              )}
            </PageSection>
          </div>

          {/* Coluna direita */}
          <div className="grid min-h-0 grid-rows-[1fr_auto] gap-6">
            <PageSection className="min-h-0 overflow-hidden">
              <SectionHeader
                title="Manutenções nos últimos 6 meses"
                subtitle="Acompanhe a evolução por tipo de manutenção"
              />

              <div className="h-[260px]">
                <BarChart data={dashboard.manutencoesPorTipo} />
              </div>
            </PageSection>

            <PageSection className="overflow-hidden">
              <SectionHeader
                title="Resumo operacional"
                subtitle="Leitura rápida do estado atual do sistema"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1">
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
                        {dashboard.totalEquipamentos} equipamento(s) cadastrados
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
                        {dashboard.emManutencao} ordem(ns) em aberto
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
                        Acompanhar alertas ativos e contratos próximos do vencimento
                      </p>
                    </div>
                  </div>
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