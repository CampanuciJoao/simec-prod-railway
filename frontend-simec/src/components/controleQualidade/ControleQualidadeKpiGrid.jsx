import React from 'react';
import PropTypes from 'prop-types';
import {
  faCircleCheck,
  faCircleXmark,
  faClock,
  faTriangleExclamation,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function ControleQualidadeKpiGrid({ metricas }) {
  return (
    <KpiGrid className="xl:grid-cols-5">
      <KpiCard
        icon={faCircleCheck}
        title="Aprovados"
        value={metricas?.aprovados ?? 0}
        subtitle="Em conformidade"
        tone="green"
      />
      <KpiCard
        icon={faCircleXmark}
        title="Reprovados"
        value={metricas?.reprovados ?? 0}
        subtitle="Aguardando reteste"
        tone="red"
      />
      <KpiCard
        icon={faClock}
        title="Vencendo 30d"
        value={metricas?.vencendo30d ?? 0}
        subtitle="Renovação próxima"
        tone="yellow"
      />
      <KpiCard
        icon={faTriangleExclamation}
        title="Vencidos"
        value={metricas?.vencidos ?? 0}
        subtitle="Risco regulatório"
        tone="red"
      />
      <KpiCard
        icon={faClipboardList}
        title="Sem programa"
        value={metricas?.semPrograma ?? 0}
        subtitle="Equipamentos regulados"
        tone="orange"
      />
    </KpiGrid>
  );
}

ControleQualidadeKpiGrid.propTypes = {
  metricas: PropTypes.shape({
    aprovados: PropTypes.number,
    reprovados: PropTypes.number,
    vencendo30d: PropTypes.number,
    vencidos: PropTypes.number,
    semPrograma: PropTypes.number,
  }),
};

export default ControleQualidadeKpiGrid;
