import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function LoadingState({ message = 'Carregando...' }) {
  return (
    <div
      className="ui-surface ui-shadow-sm rounded-2xl border px-6 py-10 text-center"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'var(--brand-primary-soft)',
            color: 'var(--brand-primary)',
          }}
        >
          <FontAwesomeIcon icon={faSpinner} spin />
        </span>

        <div>
          <p className="ui-text-primary text-sm font-semibold">{message}</p>
          <p className="ui-text-muted mt-1 text-sm">
            Aguarde enquanto carregamos os dados.
          </p>
        </div>
      </div>
    </div>
  );
}

LoadingState.propTypes = {
  message: PropTypes.string,
};

export default LoadingState;