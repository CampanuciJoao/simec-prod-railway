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
  interactive = false,
  style = {},
}) {
  const surfaceStyle = surfaceStyleMap[surface] || surfaceStyleMap.default;

  return (
    <div
      className={[
        'rounded-2xl border transition-all',
        padded ? 'p-4 md:p-5' : '',
        interactive
          ? 'cursor-pointer hover:shadow-md hover:border-[var(--border-strong)]'
          : '',
        className,
      ].join(' ')}
      style={{
        ...surfaceStyle,
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
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
  interactive: PropTypes.bool,
  style: PropTypes.object,
};

export default Card;