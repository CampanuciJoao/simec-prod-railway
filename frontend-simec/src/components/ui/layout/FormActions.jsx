import React from 'react';
import PropTypes from 'prop-types';

function FormActions({
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  align = 'right',
}) {
  const alignMap = {
    left: 'justify-start',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={[
        'flex flex-col gap-2 pt-4 sm:flex-row',
        alignMap[align] || 'justify-end',
      ].join(' ')}
    >
      {onCancel ? (
        <button
          type="button"
          className="btn btn-secondary w-full sm:w-auto"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </button>
      ) : null}

      <button
        type="button"
        className="btn btn-primary w-full sm:w-auto"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </div>
  );
}

FormActions.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  loading: PropTypes.bool,
  submitLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  align: PropTypes.oneOf(['left', 'right', 'between']),
};

export default FormActions;