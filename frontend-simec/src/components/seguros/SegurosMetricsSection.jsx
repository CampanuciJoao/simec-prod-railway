import {
  faClockRotateLeft,
  faFileShield,
  faShieldAlt,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function SegurosMetricsSection({ metricas, onFilter }) {
  return (
    <KpiGrid className="md:grid-cols-4 xl:grid-cols-4">
      <KpiCard
        icon={faFileShield}
        title="Total"
        value={metricas.total}
        tone="blue"
        onClick={() => onFilter()}
      />
      <KpiCard
        icon={faShieldAlt}
        title="Ativos"
        value={metricas.ativos}
        tone="green"
        onClick={() => onFilter('Ativo')}
      />
      <KpiCard
        icon={faClockRotateLeft}
        title="Vencendo"
        value={metricas.vencendo}
        tone="yellow"
        onClick={() => onFilter('Vence em breve')}
      />
      <KpiCard
        icon={faTriangleExclamation}
        title="Vencidos"
        value={metricas.vencidos}
        tone="red"
        onClick={() => onFilter('Expirado')}
      />
    </KpiGrid>
  );
}

export default SegurosMetricsSection;
