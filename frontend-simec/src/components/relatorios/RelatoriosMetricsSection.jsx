import PropTypes from 'prop-types';
import {
  faBuilding,
  faCalendarCheck,
  faChartColumn,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function RelatoriosMetricsSection({ metricas }) {
  return (
    <KpiGrid className="md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={faChartColumn}
        title="Relatorios gerados"
        value={metricas?.totalRelatorios || 0}
        tone="blue"
      />
      <KpiCard
        icon={faFileLines}
        title="Itens retornados"
        value={metricas?.totalItens || 0}
        tone="green"
      />
      <KpiCard
        icon={faCalendarCheck}
        title="Periodos filtrados"
        value={metricas?.periodosAplicados || 0}
        tone="yellow"
      />
      <KpiCard
        icon={faBuilding}
        title="Unidades filtradas"
        value={metricas?.unidadesFiltradas || 0}
        tone="purple"
      />
    </KpiGrid>
  );
}

RelatoriosMetricsSection.propTypes = {
  metricas: PropTypes.object,
};

export default RelatoriosMetricsSection;
