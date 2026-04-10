import React from 'react';
import { faChartPie } from '@fortawesome/free-solid-svg-icons';

import { useDashboard } from '../../hooks/dashboard/useDashboard';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';

function DashboardPage() {
  const { data, loading, error } = useDashboard();

  return (
    <PageLayout>
      <PageHeader title="Dashboard" icon={faChartPie} variant="light" />

      {loading || error ? (
        <PageState
          loading={loading}
          error={error || ''}
          isEmpty={false}
        />
      ) : (
        <>
          <PageSection title="Resumo Geral">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="kpi-card">
                <span>Total Equipamentos</span>
                <strong>{data.totalEquipamentos}</strong>
              </div>

              <div className="kpi-card">
                <span>Em Manutenção</span>
                <strong>{data.emManutencao}</strong>
              </div>

              <div className="kpi-card">
                <span>Ativos</span>
                <strong>{data.ativos}</strong>
              </div>

              <div className="kpi-card">
                <span>Inativos</span>
                <strong>{data.inativos}</strong>
              </div>
            </div>
          </PageSection>

          <PageSection title="Visão Analítica" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="mb-2 font-semibold text-slate-600">
                  Manutenções por Tipo
                </h4>
                <BarChart data={data.manutencoesPorTipo} />
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-slate-600">
                  Status dos Equipamentos
                </h4>
                <DonutChart data={data.statusEquipamentos} />
              </div>
            </div>
          </PageSection>

          <PageSection title="Alertas Recentes" className="mt-6">
            {data.alertas?.length > 0 ? (
              <ul className="space-y-2">
                {data.alertas.map((alerta, index) => (
                  <li
                    key={alerta.id || alerta._id || `${alerta.mensagem || 'alerta'}-${index}`}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    {alerta.mensagem || alerta.descricao || alerta.titulo || 'Alerta sem descrição'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">
                Nenhum alerta recente.
              </p>
            )}
          </PageSection>
        </>
      )}
    </PageLayout>
  );
}

export default DashboardPage;