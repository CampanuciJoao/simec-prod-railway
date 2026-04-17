import React from 'react';
import PropTypes from 'prop-types';

import Badge from '@/components/ui/primitives/Badge';
import { getStatusVariant } from '@/components/ui/uistyles/statusStyles';

function formatLabel(value) {
  if (!value) return 'N/A';

  return String(value)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
}

function StatusBadge({ value, className = '' }) {
  const variant = getStatusVariant(value);

  return (
    <Badge variant={variant} className={className}>
      {formatLabel(value)}
    </Badge>
  );
}

StatusBadge.propTypes = {
  value: PropTypes.string,
  className: PropTypes.string,
};

export default StatusBadge;