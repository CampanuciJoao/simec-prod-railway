import React from 'react';
import {
  faChartPie,
  faMicrochip,
  faWrench,
  faCircleCheck,
  faTriangleExclamation,
  faFileContract,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useDashboard } from '../../hooks/dashboard/useDashboard';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';

function KpiCard({ icon, title, value, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
        <FontAwesomeIcon icon={icon} />
      </div>

      <div>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
        <div className="text-3xl font-bold text-slate-900 leading-none mt-1">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-2">{subtitle}</div>}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { data, loading, error } = useDashboard();

  const isInitialLoading = loading;
  const hasError = !!error;
  const hasCharts =
    !!data.manutencoesPorTipo?.labels?.length || !!data.statusEquipamentos?.labels?.length;

  return (
    <PageLayout background="slate">
      <PageHeader title="Dashboard" icon={faChartPie} variant="light" />

      {isInitialLoading || hasError ? (
        <PageState
          loading={isInitialLoading}
          error={error || ''}
          isEmpty={false}
        />
      ) : (
        <>
          <PageSection title="Resumo Geral">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                icon={faMicrochip}
                title="Total Equipamentos"
                value={data.totalEquipamentos}
                subtitle="Base cadastrada"
              />
              <KpiCard
                icon={faWrench}
                title="Em Manutenção"
                value={data.emManutencao}
                subtitle="OS pendentes e em andamento"
              />
              <KpiCard
                icon={faFileContract}
                title="Contratos Vencendo"
                value={data.contratosVencendo}
                subtitle="Próximos 30 dias"
              />
              <KpiCard
                icon={faTriangleExclamation}
                title="Alertas Ativos"
                value={data.alertasAtivos}
                subtitle="Ainda não vistos"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <KpiCard
                icon={faCircleCheck}
                title="Equipamentos Operantes"
                value={data.ativos}
                subtitle="Status operante"
              />
              <KpiCard
                icon={faTriangleExclamation}
                title="Equipamentos com Atenção"
                value={data.inativos}
                subtitle="Inoperantes ou uso limitado"
              />
            </div>
          </PageSection>

          <PageSection title="Visão Analítica" className="mt-6">
            {hasCharts ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[320px]">
                  <h4 className="mb-4 text-sm font-semibold text-slate-600">
                    Manutenções por Tipo
                  </h4>
                  <div className="h-[240px]">
                    <BarChart chartData={data.manutencoesPorTipo} />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[320px]">
                  <h4 className="mb-4 text-sm font-semibold text-slate-600">
                    Status dos Equipamentos
                  </h4>
                  <div className="h-[240px]">
                    <DonutChart chartData={data.statusEquipamentos} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-14 text-center text-slate-400 italic">
                Ainda não há dados suficientes para montar os gráficos do dashboard.
              </div>
            )}
          </PageSection>

          <PageSection title="Alertas Recentes" className="mt-6">
            {data.alertas?.length > 0 ? (
              <div className="space-y-3">
                {data.alertas.map((alerta) => (
                  <div
                    key={alerta.id}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50"
                  >
                    <div className="font-semibold text-amber-800">
                      {alerta.titulo || 'Alerta'}
                    </div>
                    <div className="text-sm text-amber-700 mt-1">
                      Prioridade: {alerta.prioridade || 'Normal'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 italic">
                Nenhum alerta recente.
              </div>
            )}
          </PageSection>
        </>
      )}
    </PageLayout>
  );
}

export default DashboardPage;