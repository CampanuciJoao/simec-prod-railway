// Select custom com dropdown estilizado (nao usa o <select> nativo do
// browser). Padrao SIMEC: botao com borda arredondada igual Input/Combobox,
// painel flutuante com opcoes clicaveis, tema escuro consistente.
//
// Diferente do ComboboxAutocomplete: aqui o usuario SO escolhe entre as
// opcoes existentes, nao digita texto livre.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function SelectMenu({
  id,
  name,
  label,
  hint,
  error,
  required = false,
  value,
  options = [],
  onChange,
  placeholder = 'Selecione',
  disabled = false,
  className = '',
}) {
  const inputId = id || name;
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value ?? '')),
    [options, value]
  );

  useEffect(() => {
    if (!open) return;
    const handleClickFora = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => String(o.value) === String(value ?? ''));
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const selecionar = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    setHighlight(-1);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      if (highlight >= 0 && options[highlight]) selecionar(options[highlight]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    } else if (event.key === 'Tab') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const handleFocus = (event) => {
    event.currentTarget.style.boxShadow = error
      ? '0 0 0 4px var(--color-danger-soft)'
      : '0 0 0 4px var(--brand-primary-soft)';
  };
  const handleBlur = (event) => {
    event.currentTarget.style.boxShadow = 'none';
  };

  return (
    <FormFieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
    >
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          id={inputId}
          name={name}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={[
            'ui-transition flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm outline-none',
            'disabled:cursor-not-allowed disabled:opacity-70',
            className,
          ].join(' ')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: error ? 'var(--color-danger)' : 'var(--border-default)',
            color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="shrink-0 text-xs transition-transform"
            style={{
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={`${inputId}-listbox`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-xl border py-1 shadow-lg"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {options.length === 0 ? (
              <li
                className="px-3 py-2 text-xs italic"
                style={{ color: 'var(--text-muted)' }}
              >
                Nenhuma opção disponível
              </li>
            ) : (
              options.map((opt, idx) => {
                const ehDestacado = idx === highlight;
                const ehSelecionado = String(opt.value) === String(value ?? '');
                return (
                  <li
                    key={opt.value}
                    data-idx={idx}
                    role="option"
                    aria-selected={ehSelecionado}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selecionar(opt);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm"
                    style={{
                      backgroundColor: ehDestacado
                        ? 'var(--brand-primary-soft)'
                        : 'transparent',
                      color: ehSelecionado
                        ? 'var(--brand-primary)'
                        : 'var(--text-primary)',
                      fontWeight: ehSelecionado ? 600 : 400,
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                    {ehSelecionado && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="shrink-0 text-xs"
                        style={{ color: 'var(--brand-primary)' }}
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </FormFieldShell>
  );
}

SelectMenu.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default SelectMenu;
