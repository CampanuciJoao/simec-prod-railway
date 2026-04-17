import React from 'react';
import PropTypes from 'prop-types';

function PageLayout({
  children,
  className = '',
  contentClassName = '',
  padded = false,
  fullHeight = false,
}) {
  return (
    <div
      className={[
        'min-w-0 transition-colors',
        fullHeight ? 'min-h-screen' : '',
        className,
      ].join(' ')}
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <div
        className={[
          'mx-auto w-full max-w-[1600px]',
          padded ? 'px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6' : '',
          contentClassName,
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

PageLayout.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
  padded: PropTypes.bool,
  fullHeight: PropTypes.bool,
};

export default PageLayout;