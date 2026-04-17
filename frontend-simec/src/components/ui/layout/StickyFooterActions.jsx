import React from 'react';
import PropTypes from 'prop-types';

function StickyFooterActions({ children, className = '' }) {
  return (
    <div
      className={[
        'sticky bottom-0 z-10 border-t px-4 py-4 backdrop-blur sm:px-5',
        className,
      ].join(' ')}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {children}
      </div>
    </div>
  );
}

StickyFooterActions.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export default StickyFooterActions;