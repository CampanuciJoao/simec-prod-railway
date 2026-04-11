import React from 'react';

function EmptyState({ message = 'Nenhum registro encontrado.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
      {message}
    </div>
  );
}

export default EmptyState;