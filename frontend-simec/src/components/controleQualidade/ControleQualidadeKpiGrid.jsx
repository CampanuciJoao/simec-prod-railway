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

function ControleQualidadeKpiGrid({ metricas, activeKpi, onSelectKpi }) {
  const kpiActive = (key) =>
    activeKpi === key ? 'ring-2 ring-offset-2 ring-offset-transparent' : '';
  const handle = (key) => () => onSelectKpi?.(key);

  return (
    <KpiGrid cols={5}>
      <KpiCard
        icon={faCircleCheck}
        title="Aprovados"
        value={metricas?.aprovados ?? 0}
        subtitle="Em conformidade"
        tone="green"
        onClick={handle('aprovados')}
        className={kpiActive('aprovados')}
      />
      <KpiCard
        icon={faCircleXmark}
        title="Reprovados"
        value={metricas?.reprovados ?? 0}
        subtitle="Aguardando reteste"
        tone="red"
        onClick={handle('reprovados')}
        className={kpiActive('reprovados')}
      />
      <KpiCard
        icon={faClock}
        title="Vencendo 30d"
        value={metricas?.vencendo30d ?? 0}
        subtitle="Renovação próxima"
        tone="yellow"
        onClick={handle('vencendo')}
        className={kpiActive('vencendo')}
      />
      <KpiCard
        icon={faTriangleExclamation}
        title="Vencidos"
        value={metricas?.vencidos ?? 0}
        subtitle="Risco regulatório"
        tone="red"
        onClick={handle('vencidos')}
        className={kpiActive('vencidos')}
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
  activeKpi: PropTypes.oneOf(['aprovados', 'reprovados', 'vencendo', 'vencidos', null]),
  onSelectKpi: PropTypes.func,
};

export default ControleQualidadeKpiGrid;
