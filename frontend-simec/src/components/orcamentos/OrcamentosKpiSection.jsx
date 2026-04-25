import {
  faFileInvoiceDollar,
  faCheckCircle,
  faHourglass,
  faPencil,
} from '@fortawesome/free-solid-svg-icons';
import { KpiCard, KpiGrid } from '@/components/ui';

function OrcamentosKpiSection({ metricas, filtrarPorStatus, limparFiltro }) {
  return (
    <KpiGrid className="md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={faFileInvoiceDollar}
        title="Total"
        value={metricas.total}
        tone="blue"
        onClick={limparFiltro}
      />
      <KpiCard
        icon={faPencil}
        title="Rascunhos"
        value={metricas.RASCUNHO ?? 0}
        tone="slate"
        onClick={() => filtrarPorStatus('RASCUNHO')}
      />
      <KpiCard
        icon={faHourglass}
        title="Pendentes"
        value={metricas.PENDENTE ?? 0}
        tone="yellow"
        onClick={() => filtrarPorStatus('PENDENTE')}
      />
      <KpiCard
        icon={faCheckCircle}
        title="Aprovados"
        value={metricas.APROVADO ?? 0}
        tone="green"
        onClick={() => filtrarPorStatus('APROVADO')}
      />
    </KpiGrid>
  );
}

export default OrcamentosKpiSection;
