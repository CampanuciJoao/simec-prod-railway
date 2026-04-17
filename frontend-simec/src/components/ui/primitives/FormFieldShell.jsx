import React from 'react';
import PropTypes from 'prop-types';

function FormFieldShell({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  children,
  className = '',
}) {
  const hasHeader = Boolean(label || hint);

  return (
    <div className={['space-y-1.5', className].join(' ')}>
      {hasHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {label ? (
              <label
                htmlFor={htmlFor}
                className="ui-text-primary text-sm font-semibold"
              >
                {label}
                {required ? (
                  <span
                    className="ml-1"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    *
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>

          {hint ? (
            <span className="ui-text-muted shrink-0 text-xs">
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}

      {children}

      {error ? (
        <p
          className="text-xs font-medium"
          style={{ color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

FormFieldShell.propTypes = {
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  htmlFor: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default FormFieldShell;