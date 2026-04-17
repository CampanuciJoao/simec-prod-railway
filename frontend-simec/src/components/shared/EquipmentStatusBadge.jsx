import React from 'react';
import PropTypes from 'prop-types';

import { Badge } from '@/components/ui';

const EQUIPMENT_STATUS_CONFIG = {
  operante: {
    label: 'Operante',
    variant: 'green',
  },
  operacional: {
    label: 'Operacional',
    variant: 'green',
  },
  emmanutencao: {
    label: 'Em manutenção',
    variant: 'yellow',
  },
  inoperante: {
    label: 'Inoperante',
    variant: 'red',
  },
  usolimitado: {
    label: 'Uso limitado',
    variant: 'orange', // ✅ ALTERADO
  },
};

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function EquipmentStatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const config = EQUIPMENT_STATUS_CONFIG[normalizedStatus] || {
    label: status || 'N/A',
    variant: 'slate',
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

EquipmentStatusBadge.propTypes = {
  status: PropTypes.string,
};

export default EquipmentStatusBadge;