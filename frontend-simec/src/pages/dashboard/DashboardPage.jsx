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

import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';

function SummaryCard({ icon, title, value, subtitle }) {
  return (
    <div className="card">
      <div className="card-icon">
        <FontAwesomeIcon icon={icon} />
      </div>

      <div className="card-text-content">
        <span className="card-title">{title}</span>
        <span className="card-value">{value}</span>
        {subtitle ? <small className="card-subtitle">{subtitle}</small> : null}
      </div>
    </div>
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
      <PageLayout background="slate">
        <PageHeader title="Dashboard" icon={faChartPie} variant="default" />
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
    <PageLayout background="slate">
      <PageHeader title="Dashboard" icon={faChartPie} variant="default" />

      <div className="summary-cards">
        <div className="card-link">
          <SummaryCard
            icon={faHeartbeat}
            title="Equipamentos"
            value={data.totalEquipamentos}
            subtitle="Parque total"
          />
        </div>

        <div className="card-link">
          <SummaryCard
            icon={faWrench}
            title="Manutenções Pendentes"
            value={data.emManutencao}
            subtitle="OS abertas"
          />
        </div>

        <div className="card-link">
          <SummaryCard
            icon={faFileContract}
            title="Contratos Vencendo"
            value={data.contratosVencendo}
            subtitle="Próximos 30 dias"
          />
        </div>

        <div className="card-link">
          <SummaryCard
            icon={faBell}
            title="Alertas Ativos"
            value={data.alertasAtivos}
            subtitle="Não visualizados"
          />
        </div>
      </div>

      <div className="detailed-sections">
        <PageSection
          title="Alertas Recentes / Críticos"
          className="alerts-section"
        >
          <div className="alerts-list">
            {data.alertas?.length > 0 ? (
              <ul>
                {data.alertas.map((alerta) => (
                  <li key={alerta.id}>
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="alert-icon"
                    />
                    <span>{alerta.titulo}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data-message">Nenhum alerta recente.</p>
            )}
          </div>
        </PageSection>

        <PageSection title="Visão Analítica" className="charts-section">
          <div className="chart-container-dashboard">
            <h2>
              <FontAwesomeIcon icon={faChartPie} /> Status dos Equipamentos
            </h2>
            <div className="chart-wrapper">
              <DonutChart chartData={data.statusEquipamentos} />
            </div>

            <hr className="chart-separator" />

            <h2>
              <FontAwesomeIcon icon={faChartColumn} /> Manutenções nos Últimos 6 Meses
            </h2>
            <div className="chart-wrapper">
              <BarChart chartData={data.manutencoesPorTipo} />
            </div>
          </div>
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default DashboardPage;