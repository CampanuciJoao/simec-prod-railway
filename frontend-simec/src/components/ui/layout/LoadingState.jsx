import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function LoadingState({
  message = 'Carregando...',
  className = '',
}) {
  return (
    <div
      className={[
        'flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm',
        className,
      ].join(' ')}
    >
      <FontAwesomeIcon icon={faSpinner} spin />
      {message}
    </div>
  );
}

LoadingState.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
};

export default LoadingState;