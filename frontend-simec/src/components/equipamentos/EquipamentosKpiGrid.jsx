import React from 'react';
import PropTypes from 'prop-types';
import {
  faMicrochip,
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCard, KpiGrid } from '@/components/ui';

function EquipamentosKpiGrid({
  metricas,
  onClearAllFilters,
  onFilterStatus,
}) {
  return (
    <KpiGrid className="xl:grid-cols-5">
      <KpiCard
        icon={faMicrochip}
        title="Total"
        value={metricas.total ?? 0}
        subtitle="Todos os ativos"
        tone="slate"
        onClick={onClearAllFilters}
      />

      <KpiCard
        icon={faCircleCheck}
        title="Operantes"
        value={metricas.operantes ?? 0}
        subtitle="Em operação"
        tone="green"
        onClick={() => onFilterStatus('Operante')}
      />

      <KpiCard
        icon={faScrewdriverWrench}
        title="Em manutenção"
        value={metricas.emManutencao ?? 0}
        subtitle="Intervenção ativa"
        tone="yellow"
        onClick={() => onFilterStatus('EmManutencao')}
      />

      <KpiCard
        icon={faCircleXmark}
        title="Inoperantes"
        value={metricas.inoperantes ?? 0}
        subtitle="Fora de operação"
        tone="red"
        onClick={() => onFilterStatus('Inoperante')}
      />

      <KpiCard
        icon={faTriangleExclamation}
        title="Uso limitado"
        value={metricas.usoLimitado ?? 0}
        subtitle="Operação restrita"
        tone="orange"
        onClick={() => onFilterStatus('UsoLimitado')}
      />
    </KpiGrid>
  );
}

EquipamentosKpiGrid.propTypes = {
  metricas: PropTypes.shape({
    total: PropTypes.number,
    operantes: PropTypes.number,
    emManutencao: PropTypes.number,
    inoperantes: PropTypes.number,
    usoLimitado: PropTypes.number,
  }).isRequired,
  onClearAllFilters: PropTypes.func.isRequired,
  onFilterStatus: PropTypes.func.isRequired,
};

export default EquipamentosKpiGrid;