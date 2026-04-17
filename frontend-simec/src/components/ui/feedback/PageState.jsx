import React from 'react';
import PropTypes from 'prop-types';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

function ErrorState({ message }) {
  return (
    <div className="ui-surface ui-shadow-sm rounded-2xl border px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
          }}
        >
          !
        </span>

        <div>
          <p className="ui-text-primary text-sm font-semibold">
            Ocorreu um problema
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-danger)' }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function PageState({
  loading = false,
  error = '',
  isEmpty = false,
  emptyMessage = 'Nenhum dado encontrado.',
}) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} />;
  }

  return null;
}

PageState.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  isEmpty: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default PageState;