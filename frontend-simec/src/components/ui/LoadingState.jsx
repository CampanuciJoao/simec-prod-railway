import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function LoadingState({ message = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
      <FontAwesomeIcon icon={faSpinner} spin />
      <span>{message}</span>
    </div>
  );
}

export default LoadingState;