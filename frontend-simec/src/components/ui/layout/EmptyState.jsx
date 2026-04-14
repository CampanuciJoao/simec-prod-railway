import React from 'react';
import PropTypes from 'prop-types';

function EmptyState({
  message = 'Nenhum dado disponível.',
  className = '',
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm',
        className,
      ].join(' ')}
    >
      {message}
    </div>
  );
}

EmptyState.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
};

export default EmptyState;