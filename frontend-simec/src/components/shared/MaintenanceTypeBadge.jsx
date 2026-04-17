import React from 'react';
import PropTypes from 'prop-types';

import { Badge } from '@/components/ui';

const MAINTENANCE_TYPE_CONFIG = {
  preventiva: {
    label: 'Preventiva',
    variant: 'blue',
  },
  corretiva: {
    label: 'Corretiva',
    variant: 'orange',
  },
  calibracao: {
    label: 'Calibração',
    variant: 'purple',
  },
  inspecao: {
    label: 'Inspeção',
    variant: 'green',
  },
};

function normalizeType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function MaintenanceTypeBadge({ tipo }) {
  const normalizedType = normalizeType(tipo);

  const config = MAINTENANCE_TYPE_CONFIG[normalizedType] || {
    label: tipo || 'N/A',
    variant: 'slate',
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

MaintenanceTypeBadge.propTypes = {
  tipo: PropTypes.string,
};

export default MaintenanceTypeBadge;