import React from 'react';
import PropTypes from 'prop-types';

const variantStyles = {
  blue: {
    backgroundColor: 'var(--brand-primary-soft)',
    color: 'var(--brand-primary)',
    border: '1px solid transparent',
  },
  orange: {
    backgroundColor: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
    border: '1px solid transparent',
  },
  green: {
    backgroundColor: 'var(--color-success-soft)',
    color: 'var(--color-success)',
    border: '1px solid transparent',
  },
  yellow: {
    backgroundColor: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
    border: '1px solid transparent',
  },
  red: {
    backgroundColor: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
    border: '1px solid transparent',
  },
  slate: {
    backgroundColor: 'var(--bg-surface-subtle)',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  purple: {
    backgroundColor: 'var(--color-info-soft)',
    color: 'var(--color-info)',
    border: '1px solid transparent',
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
  variant: PropTypes.oneOf([
    'blue',
    'orange',
    'green',
    'yellow',
    'red',
    'slate',
    'purple',
    'outline',
  ]),
  className: PropTypes.string,
};

export default Badge;