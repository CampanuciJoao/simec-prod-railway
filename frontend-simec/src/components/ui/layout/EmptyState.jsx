import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInbox } from '@fortawesome/free-solid-svg-icons';

function EmptyState({ message = 'Nenhum dado encontrado.' }) {
  return (
    <div className="ui-surface ui-shadow-sm rounded-2xl border px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <FontAwesomeIcon icon={faInbox} />
        </span>

        <div>
          <p className="ui-text-primary text-sm font-semibold">
            Nada para exibir
          </p>
          <p className="ui-text-muted mt-1 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

EmptyState.propTypes = {
  message: PropTypes.string,
};

export default EmptyState;