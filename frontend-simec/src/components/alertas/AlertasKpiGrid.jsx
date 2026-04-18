import PropTypes from 'prop-types';
import {
  faBell,
  faCircleCheck,
  faLightbulb,
  faList,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function AlertasKpiGrid({
  metricas,
  totalRecomendacoes,
  onClearAll,
  onFilterNaoVistos,
  onFilterVistos,
  onFilterCriticos,
  onFilterRecomendacoes,
}) {
  return (
    <KpiGrid className="mb-6 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        icon={faList}
        title="Total"
        value={metricas.total}
        tone="slate"
        onClick={onClearAll}
      />
      <KpiCard
        icon={faBell}
        title="Nao vistos"
        value={metricas.naoVistos}
        tone="blue"
        onClick={onFilterNaoVistos}
      />
      <KpiCard
        icon={faCircleCheck}
        title="Vistos"
        value={metricas.vistos}
        tone="green"
        onClick={onFilterVistos}
      />
      <KpiCard
        icon={faTriangleExclamation}
        title="Criticos"
        value={metricas.criticos}
        tone="red"
        onClick={onFilterCriticos}
      />
      <KpiCard
        icon={faLightbulb}
        title="Recomendacoes"
        value={totalRecomendacoes}
        tone="purple"
        onClick={onFilterRecomendacoes}
      />
    </KpiGrid>
  );
}

AlertasKpiGrid.propTypes = {
  metricas: PropTypes.object.isRequired,
  totalRecomendacoes: PropTypes.number.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onFilterNaoVistos: PropTypes.func.isRequired,
  onFilterVistos: PropTypes.func.isRequired,
  onFilterCriticos: PropTypes.func.isRequired,
  onFilterRecomendacoes: PropTypes.func.isRequired,
};

export default AlertasKpiGrid;
