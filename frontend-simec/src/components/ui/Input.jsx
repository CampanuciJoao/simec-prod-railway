import React from 'react';

function Input({ className = '', ...props }) {
  return (
    <input
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
        className,
      ].join(' ')}
      {...props}
    />
  );
}

export default Input;