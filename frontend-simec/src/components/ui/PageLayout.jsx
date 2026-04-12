import React from 'react';
import PropTypes from 'prop-types';

function PageLayout({
  children,
  background = 'default',
  padded = true,
  fullHeight = false,
  className = '',
  contentClassName = '',
  disableContainer = false,
  spacing = 'default',
}) {
  const backgroundClassMap = {
    default: 'bg-white',
    slate: 'bg-slate-100',
    transparent: 'bg-transparent',
  };

  const spacingClassMap = {
    none: '',
    compact: 'py-4 md:py-5',
    default: 'py-6 md:py-8',
    relaxed: 'py-8 md:py-10',
  };

  const wrapperClasses = [
    backgroundClassMap[background] || backgroundClassMap.default,
    fullHeight ? 'min-h-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const innerClasses = [
    padded ? 'px-4 md:px-6' : '',
    spacingClassMap[spacing] || spacingClassMap.default,
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  if (disableContainer) {
    return <div className={wrapperClasses}>{children}</div>;
  }

  return (
    <div className={wrapperClasses}>
      <div className="page-shell">
        <div className={innerClasses}>{children}</div>
      </div>
    </div>
  );
}

PageLayout.propTypes = {
  children: PropTypes.node.isRequired,
  background: PropTypes.oneOf(['default', 'slate', 'transparent']),
  padded: PropTypes.bool,
  fullHeight: PropTypes.bool,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
  disableContainer: PropTypes.bool,
  spacing: PropTypes.oneOf(['none', 'compact', 'default', 'relaxed']),
};

export default PageLayout;