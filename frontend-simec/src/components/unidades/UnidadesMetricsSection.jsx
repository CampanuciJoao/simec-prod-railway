import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faHashtag,
  faInfoCircle,
  faCity,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function KpiCard({ icon, title, value, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card>
        <div className="flex items-center gap-4">
          <FontAwesomeIcon icon={icon} />
          <div>
            <p className="text-xs text-slate-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}

function UnidadesMetricsSection({ metricas, onClear }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KpiCard icon={faBuilding} title="Total" value={metricas.total} onClick={onClear} />
      <KpiCard icon={faHashtag} title="Com CNPJ" value={metricas.comCnpj} />
      <KpiCard icon={faInfoCircle} title="Sem CNPJ" value={metricas.semCnpj} />
      <KpiCard icon={faCity} title="Cidades" value={metricas.cidadesAtendidas} />
    </div>
  );
}

export default UnidadesMetricsSection;