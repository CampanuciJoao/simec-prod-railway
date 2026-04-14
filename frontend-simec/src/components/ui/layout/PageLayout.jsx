import React from 'react';
import PropTypes from 'prop-types';

function PageLayout({
  children,
  background = 'slate',
  padded = true,
  fullHeight = false,
  width = '7xl',
  className = '',
}) {
  const backgroundClass =
    background === 'white'
      ? 'bg-white'
      : background === 'transparent'
        ? 'bg-transparent'
        : 'bg-slate-50';

  const widthClassMap = {
    full: 'max-w-none',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  const widthClass = widthClassMap[width] || widthClassMap['7xl'];

  return (
    <div
      className={[
        'w-full',
        backgroundClass,
        fullHeight ? 'min-h-screen' : '',
        className,
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto w-full',
          widthClass,
          padded ? 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8' : '',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

PageLayout.propTypes = {
  children: PropTypes.node.isRequired,
  background: PropTypes.oneOf(['slate', 'white', 'transparent']),
  padded: PropTypes.bool,
  fullHeight: PropTypes.bool,
  width: PropTypes.oneOf(['full', '4xl', '5xl', '6xl', '7xl']),
  className: PropTypes.string,
};

export default PageLayout;