import React from 'react';
import PropTypes from 'prop-types';

function InlineEmptyState({ message = 'Nenhum item encontrado.' }) {
  return (
    <div
      className="rounded-xl border border-dashed px-4 py-6 text-center text-sm"
      style={{
        borderColor: 'var(--border-default)',
        backgroundColor: 'var(--bg-surface-soft)',
        color: 'var(--text-muted)',
      }}
    >
      {message}
    </div>
  );
}

InlineEmptyState.propTypes = {
  message: PropTypes.string,
};

export default InlineEmptyState;