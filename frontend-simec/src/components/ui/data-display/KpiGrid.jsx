import React from 'react';
import PropTypes from 'prop-types';

// Tailwind classes precisam ser estáticas no source para o JIT detectar.
const COLS_CLASSES = {
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

function KpiGrid({ children, className = '', cols = 4 }) {
  const colsClasses = COLS_CLASSES[cols] || COLS_CLASSES[4];
  return (
    <div
      className={[
        'grid grid-cols-1 gap-4',
        colsClasses,
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

KpiGrid.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  cols: PropTypes.oneOf([3, 4, 5]),
};

export default KpiGrid;