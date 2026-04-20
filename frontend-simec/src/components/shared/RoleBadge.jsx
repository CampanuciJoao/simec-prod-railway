import React from 'react';
import PropTypes from 'prop-types';

import { Badge } from '@/components/ui';

const ROLE_CONFIG = {
  superadmin: {
    label: 'Superadmin',
    variant: 'blue',
  },
  admin: {
    label: 'Admin',
    variant: 'red',
  },
  user: {
    label: 'Usuario',
    variant: 'green',
  },
};

function RoleBadge({ role }) {
  const normalizedRole = String(role || '').toLowerCase();

  const config = ROLE_CONFIG[normalizedRole] || {
    label: role || '-',
    variant: 'slate',
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

RoleBadge.propTypes = {
  role: PropTypes.string,
};

export default RoleBadge;
