import React from 'react';
import PropTypes from 'prop-types';

import { Button } from '@/components/ui/primitives';

function FormActions({
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  align = 'right',
  className = '',
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
        className,
      ].join(' ')}
    >
      {onCancel ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
      ) : null}

      <Button
        type="submit" // 🔥 importante para forms
        variant="primary"
        className="w-full sm:w-auto"
        onClick={onSubmit} // mantém compatível se não estiver dentro de form
        disabled={loading}
      >
        {loading ? 'Salvando...' : submitLabel}
      </Button>
    </div>
  );
}

FormActions.propTypes = {
  onSubmit: PropTypes.func, // 🔥 agora opcional (form pode controlar)
  onCancel: PropTypes.func,
  loading: PropTypes.bool,
  submitLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  align: PropTypes.oneOf(['left', 'right', 'between']),
  className: PropTypes.string,
};

export default FormActions;