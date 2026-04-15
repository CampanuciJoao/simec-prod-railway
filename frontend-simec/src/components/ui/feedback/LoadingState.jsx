import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function LoadingState({ message = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <FontAwesomeIcon icon={faSpinner} spin className="mb-3 text-xl" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export default LoadingState;