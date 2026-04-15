import React from 'react';
import PropTypes from 'prop-types';

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        isAdmin
          ? 'border-red-200 bg-red-100 text-red-700'
          : 'border-emerald-200 bg-emerald-100 text-emerald-700',
      ].join(' ')}
    >
      {isAdmin ? 'Admin' : 'User'}
    </span>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.string,
};

export default RoleBadge;