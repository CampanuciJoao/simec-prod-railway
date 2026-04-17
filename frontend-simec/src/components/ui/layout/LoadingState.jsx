import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function LoadingState({ message = 'Carregando...' }) {
  return (
    <Card className="rounded-2xl px-6 py-10 text-center">
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
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {message}
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Aguarde enquanto carregamos os dados.
          </p>
        </div>
      </div>
    </Card>
  );
}

LoadingState.propTypes = {
  message: PropTypes.string,
};

export default LoadingState;