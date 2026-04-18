import {
  faBuilding,
  faCity,
  faHashtag,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function UnidadesMetricsSection({ metricas, onClear }) {
  return (
    <KpiGrid className="md:grid-cols-4 xl:grid-cols-4">
      <KpiCard
        icon={faBuilding}
        title="Total"
        value={metricas.total}
        tone="blue"
        onClick={onClear}
      />
      <KpiCard
        icon={faHashtag}
        title="Com CNPJ"
        value={metricas.comCnpj}
        tone="green"
      />
      <KpiCard
        icon={faInfoCircle}
        title="Sem CNPJ"
        value={metricas.semCnpj}
        tone="yellow"
      />
      <KpiCard
        icon={faCity}
        title="Cidades"
        value={metricas.cidadesAtendidas}
        tone="purple"
      />
    </KpiGrid>
  );
}

export default UnidadesMetricsSection;
