import React from 'react';

function Card({
  children,
  className = '',
  padded = true,
  surfaceClassName = 'bg-white',
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 shadow-sm',
        surfaceClassName,
        padded ? 'p-4 md:p-6' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default Card;