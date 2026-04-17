import React from 'react';
import PropTypes from 'prop-types';

function KpiGrid({ children, className = '' }) {
  return (
    <div
      className={[
        'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
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
};

export default KpiGrid;