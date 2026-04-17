import React from 'react';
import PropTypes from 'prop-types';

function PageActionsBar({
  left,
  right,
  className = '',
}) {
  if (!left && !right) return null;

  return (
    <div
      className={[
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-2">
        {left}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {right}
      </div>
    </div>
  );
}

PageActionsBar.propTypes = {
  left: PropTypes.node,
  right: PropTypes.node,
  className: PropTypes.string,
};

export default PageActionsBar;