import React from 'react';
import PropTypes from 'prop-types';

const variantStyles = {
  blue: {
    backgroundColor: 'var(--brand-primary-soft)',
    color: 'var(--brand-primary)',
  },
  orange: {
    backgroundColor: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
  },
  green: {
    backgroundColor: 'var(--color-success-soft)',
    color: 'var(--color-success)',
  },
  yellow: {
    backgroundColor: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
  },
  red: {
    backgroundColor: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
  },
  slate: {
    backgroundColor: 'var(--bg-surface-subtle)',
    color: 'var(--text-secondary)',
  },
  purple: {
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    color: '#7c3aed',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
  },
};

function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        className,
      ].join(' ')}
      style={variantStyles[variant] || variantStyles.slate}
    >
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.string,
  className: PropTypes.string,
};

export default Badge;