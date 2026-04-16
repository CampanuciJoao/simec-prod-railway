import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

function FieldWrapper({ label, children }) {
  if (!label) return children;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

FieldWrapper.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node.isRequired,
};

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Selecione uma opção',
  className = '',
  disabled = false,
  children = null,
  ...props
}) {
  const hasChildren = React.Children.count(children) > 0;
  const normalizedValue = value ?? '';

  return (
    <FieldWrapper label={label}>
      <div className="relative">
        <select
          name={name}
          value={normalizedValue}
          onChange={onChange}
          disabled={disabled}
          className={[
            'w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition',
            'focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
            'disabled:cursor-not-allowed disabled:opacity-60',
            className,
          ].join(' ')}
          {...props}
        >
          {!hasChildren && (
            <>
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option
                  key={`${option.value}`}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </>
          )}

          {hasChildren ? children : null}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
        </span>
      </div>
    </FieldWrapper>
  );
}

Select.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

export default Select;