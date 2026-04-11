import React from 'react';

function PageLayout({
  children,
  className = '',
  padded = true,
  fullHeight = false,
  background = 'transparent',
}) {
  const backgroundClass =
    background === 'slate' ? 'bg-slate-100' : 'bg-transparent';

  return (
    <div
      className={[
        'w-full',
        padded ? 'px-4 py-4 md:px-6 md:py-6' : '',
        fullHeight ? 'min-h-full' : '',
        backgroundClass,
        className,
      ].join(' ')}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {children}
      </div>
    </div>
  );
}

export default PageLayout;