import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileShield,
  faShieldAlt,
  faClockRotateLeft,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function KpiCard({ icon, title, value, tone, onClick }) {
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

function SegurosMetricsSection({ metricas, onFilter }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KpiCard icon={faFileShield} title="Total" value={metricas.total} onClick={() => onFilter()} />
      <KpiCard icon={faShieldAlt} title="Ativos" value={metricas.ativos} onClick={() => onFilter('Ativo')} />
      <KpiCard icon={faClockRotateLeft} title="Vencendo" value={metricas.vencendo} onClick={() => onFilter('Vence em breve')} />
      <KpiCard icon={faTriangleExclamation} title="Vencidos" value={metricas.vencidos} onClick={() => onFilter('Expirado')} />
    </div>
  );
}

export default SegurosMetricsSection;