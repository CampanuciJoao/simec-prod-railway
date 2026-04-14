import React from 'react';
import PropTypes from 'prop-types';

function ActionBar({
  left = null,
  right = null,
  className = '',
  stackedOnMobile = true,
  divider = false,
}) {
  const layoutClass = stackedOnMobile
    ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
    : 'flex items-center justify-between gap-3';

  return (
    <div
      className={[
        layoutClass,
        divider ? 'border-b border-slate-200 pb-4' : '',
        className,
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {left}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {right}
      </div>
    </div>
  );
}

ActionBar.propTypes = {
  left: PropTypes.node,
  right: PropTypes.node,
  className: PropTypes.string,
  stackedOnMobile: PropTypes.bool,
  divider: PropTypes.bool,
};

export default ActionBar;