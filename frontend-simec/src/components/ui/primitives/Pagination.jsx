import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }

  return result;
}

export default function Pagination({ page, totalPages, onPageChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = pageNumbers(page, totalPages);

  const btnBase = [
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg text-sm font-medium',
    'transition-colors duration-150 border',
  ].join(' ');

  const activeStyle = {
    backgroundColor: 'var(--brand-primary)',
    color: 'var(--text-inverse)',
    borderColor: 'var(--brand-primary)',
  };

  const inactiveStyle = {
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-soft)',
  };

  const disabledStyle = {
    backgroundColor: 'var(--bg-surface-soft)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-soft)',
    cursor: 'not-allowed',
    opacity: 0.5,
  };

  return (
    <nav
      className={`flex items-center justify-center gap-1 ${className}`}
      aria-label="Paginação"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={btnBase}
        style={page <= 1 ? disabledStyle : inactiveStyle}
        aria-label="Página anterior"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
      </button>

      {pages.map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex items-center justify-center h-8 min-w-[2rem] text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={btnBase}
            style={p === page ? activeStyle : inactiveStyle}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={btnBase}
        style={page >= totalPages ? disabledStyle : inactiveStyle}
        aria-label="Próxima página"
      >
        <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
      </button>
    </nav>
  );
}
