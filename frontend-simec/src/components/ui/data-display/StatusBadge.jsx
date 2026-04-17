import React from 'react';
import PropTypes from 'prop-types';
import Badge from '@/components/ui/primitives/Badge';

const statusVariantMap = {
  Operante: 'green',
  EmManutencao: 'yellow',
  Inoperante: 'red',
  UsoLimitado: 'blue',
  Agendada: 'blue',
  EmAndamento: 'yellow',
  AguardandoConfirmacao: 'orange',
  Concluida: 'green',
  Cancelada: 'slate',
  Ativo: 'green',
  Expirado: 'red',
  Vigente: 'green',
  'Vence em breve': 'yellow',
  NaoVisto: 'blue',
  Visto: 'slate',
  Preventiva: 'blue',
  Corretiva: 'orange',
  Calibracao: 'purple',
  Inspecao: 'green',
};

function StatusBadge({ value, className = '' }) {
  const variant = statusVariantMap[value] || 'slate';

  return (
    <Badge variant={variant} className={className}>
      {value || 'N/A'}
    </Badge>
  );
}

StatusBadge.propTypes = {
  value: PropTypes.string,
  className: PropTypes.string,
};

export default StatusBadge;