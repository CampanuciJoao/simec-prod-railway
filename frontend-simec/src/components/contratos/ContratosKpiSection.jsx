import PropTypes from 'prop-types';
import {
  faClockRotateLeft,
  faFileContract,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function ContratosKpiSection({ metricas, clearAllFilters, filtrarPorStatus }) {
  return (
    <KpiGrid className="md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={faFileContract}
        title="Total"
        value={metricas.total}
        tone="blue"
        onClick={clearAllFilters}
      />
      <KpiCard
        icon={faFileContract}
        title="Ativos"
        value={metricas.ativos}
        tone="green"
        onClick={() => filtrarPorStatus('Ativo')}
      />
      <KpiCard
        icon={faClockRotateLeft}
        title="Vencendo"
        value={metricas.vencendo}
        tone="yellow"
        onClick={() => filtrarPorStatus('Vence em breve')}
      />
      <KpiCard
        icon={faTriangleExclamation}
        title="Expirados"
        value={metricas.expirados}
        tone="red"
        onClick={() => filtrarPorStatus('Expirado')}
      />
    </KpiGrid>
  );
}

ContratosKpiSection.propTypes = {
  metricas: PropTypes.object.isRequired,
  clearAllFilters: PropTypes.func.isRequired,
  filtrarPorStatus: PropTypes.func.isRequired,
};

export default ContratosKpiSection;
