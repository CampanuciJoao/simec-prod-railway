import React from 'react';
import PropTypes from 'prop-types';

const surfaceStyleMap = {
  default: {
    backgroundColor: 'var(--bg-surface)',
    borderColor: 'var(--border-soft)',
  },
  soft: {
    backgroundColor: 'var(--bg-surface-soft)',
    borderColor: 'var(--border-soft)',
  },
  subtle: {
    backgroundColor: 'var(--bg-surface-subtle)',
    borderColor: 'var(--border-soft)',
  },
  elevated: {
    backgroundColor: 'var(--bg-elevated)',
    borderColor: 'var(--border-soft)',
  },
};

function Card({
  children,
  className = '',
  padded = true,
  surface = 'default',
}) {
  const surfaceStyle = surfaceStyleMap[surface] || surfaceStyleMap.default;

  return (
    <div
      className={[
        'rounded-2xl border shadow-sm transition-colors',
        padded ? 'p-4 md:p-5' : '',
        className,
      ].join(' ')}
      style={surfaceStyle}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padded: PropTypes.bool,
  surface: PropTypes.oneOf(['default', 'soft', 'subtle', 'elevated']),
};

export default Card;