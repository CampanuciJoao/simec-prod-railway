import React from 'react';

function Card({ children, className = '', padded = true }) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        padded ? 'p-4 md:p-6' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default Card;