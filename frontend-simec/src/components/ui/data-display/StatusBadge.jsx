import React from 'react';
import PropTypes from 'prop-types';

import Badge from '@/components/ui/primitives/Badge';
import {
  formatStatusLabel,
  getStatusVariant,
} from '@/components/ui/uistyles/statusStyles';

function StatusBadge({ value, status, label, className = '' }) {
  const resolvedValue = value ?? status;
  const variant = getStatusVariant(resolvedValue);

  return (
    <Badge variant={variant} className={className}>
      {label || formatStatusLabel(resolvedValue)}
    </Badge>
  );
}

StatusBadge.propTypes = {
  value: PropTypes.string,
  status: PropTypes.string,
  label: PropTypes.node,
  className: PropTypes.string,
};

export default StatusBadge;
