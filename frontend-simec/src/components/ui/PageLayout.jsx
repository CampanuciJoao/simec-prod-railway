// src/components/ui/PageLayout.jsx

import React from 'react';

function PageLayout({
  children,
  className = '',
  padded = true,
  fullHeight = false,
  background = 'default',
}) {
  const baseClass = 'page-content-wrapper';
  const paddingClass = padded ? ' p-6' : '';
  const heightClass = fullHeight ? ' min-h-screen' : '';

  const backgroundClassMap = {
    default: '',
    slate: ' bg-[#f8fafc]',
    white: ' bg-white',
  };

  const backgroundClass = backgroundClassMap[background] || '';

  return (
    <div
      className={`${baseClass}${paddingClass}${heightClass}${backgroundClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default PageLayout;