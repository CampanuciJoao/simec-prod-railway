// Combobox com autocomplete: input livre + dropdown de sugestoes filtradas.
// Permite o usuario escolher uma opcao existente OU digitar um valor novo.
// Usado em campos como "Fabricante" onde queremos sugerir o que ja existe
// no banco mas tambem aceitar entradas inexistentes.
//
// Substitui o <datalist> nativo do HTML5, que renderiza com estilo do
// browser (destoa do design system).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function ComboboxAutocomplete({
  id,
  name,
  label,
  hint,
  error,
  required = false,
  value = '',
  options = [],
  onChange,
  onBlur,
  placeholder = 'Digite ou escolha...',
  emptyMessage = 'Nenhuma sugestão',
  allowCreate = true, // permite valor que nao esta nas opcoes
  disabled = false,
  className = '',
}) {
  const inputId = id || name;
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const sugestoes = useMemo(() => {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(v));
  }, [value, options]);

  // Fecha ao clicar fora
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

  // Scroll automatico para item destacado
  useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const aceitarValor = (novoValor) => {
    onChange?.(novoValor);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, sugestoes.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && highlight >= 0 && sugestoes[highlight]) {
        event.preventDefault();
        aceitarValor(sugestoes[highlight]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    } else if (event.key === 'Tab') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const handleFocus = (event) => {
    if (disabled) return;
    setOpen(true);
    event.currentTarget.style.boxShadow = error
      ? '0 0 0 4px var(--color-danger-soft)'
      : '0 0 0 4px var(--brand-primary-soft)';
  };

  const handleBlur = (event) => {
    event.currentTarget.style.boxShadow = 'none';
    onBlur?.(event);
    // open continua controlado por click outside
  };

  const limpar = () => {
    onChange?.('');
    inputRef.current?.focus();
    setHighlight(-1);
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
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          value={value || ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            onChange?.(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={[
            'ui-transition w-full rounded-xl border px-3 py-2.5 pr-20 text-sm outline-none placeholder:opacity-70',
            'disabled:cursor-not-allowed disabled:opacity-70',
            className,
          ].join(' ')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: error ? 'var(--color-danger)' : 'var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />

        {/* Botao limpar (X) */}
        {value && !disabled && (
          <button
            type="button"
            onClick={limpar}
            tabIndex={-1}
            aria-label="Limpar"
            className="absolute right-9 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}

        {/* Toggle do dropdown (seta) */}
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          tabIndex={-1}
          aria-label="Abrir sugestões"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </button>

        {/* Dropdown */}
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
            {sugestoes.length === 0 ? (
              <li
                className="px-3 py-2 text-xs italic"
                style={{ color: 'var(--text-muted)' }}
              >
                {allowCreate && value
                  ? `Pressione Enter para adicionar "${value}"`
                  : emptyMessage}
              </li>
            ) : (
              sugestoes.map((opt, idx) => {
                const ehDestacado = idx === highlight;
                const ehSelecionado = String(opt).toLowerCase() === String(value || '').toLowerCase();
                return (
                  <li
                    key={opt}
                    data-idx={idx}
                    role="option"
                    aria-selected={ehSelecionado}
                    onMouseDown={(e) => {
                      // mousedown evita o blur antes do click
                      e.preventDefault();
                      aceitarValor(opt);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className="cursor-pointer px-3 py-2 text-sm"
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
                    {opt}
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

ComboboxAutocomplete.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  emptyMessage: PropTypes.string,
  allowCreate: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ComboboxAutocomplete;
