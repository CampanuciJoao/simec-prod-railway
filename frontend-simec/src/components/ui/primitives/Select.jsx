import React from 'react';

function Select({ className = '', children, ...props }) {
  return (
    <select
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  );
}

export default Select;