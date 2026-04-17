import React from 'react';
import PropTypes from 'prop-types';

function InlineEmptyState({ message = 'Nenhum item encontrado.' }) {
  return (
    <div
      className="rounded-2xl border border-dashed px-4 py-8 text-center"
      style={{
        borderColor: 'var(--border-default)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {message}
      </p>
    </div>
  );
}

InlineEmptyState.propTypes = {
  message: PropTypes.string,
};

export default InlineEmptyState;