import React from 'react';
import PropTypes from 'prop-types';

function Card({
  children,
  className = '',
  padded = true,
  surface = 'default',
}) {
  const surfaceClassMap = {
    default: 'ui-surface',
    soft: 'ui-surface-soft',
    subtle: 'ui-surface-subtle',
    elevated: 'ui-elevated',
  };

  return (
    <div
      className={[
        'ui-shadow-sm ui-transition rounded-2xl border',
        surfaceClassMap[surface] || surfaceClassMap.default,
        padded ? 'p-4 md:p-5' : '',
        className,
      ].join(' ')}
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