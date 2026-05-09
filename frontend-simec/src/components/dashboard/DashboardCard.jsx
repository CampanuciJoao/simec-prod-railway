import React, { forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical } from '@fortawesome/free-solid-svg-icons';

/**
 * Wrapper de card para o grid configurável.
 * Precisa usar forwardRef para que react-grid-layout passe a ref corretamente.
 */
const DashboardCard = forwardRef(function DashboardCard(
  { title, description, headerRight, children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      style={style}
      className={className}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...rest}
    >
      <div
        className="flex h-full flex-col overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          boxShadow: '0 4px 16px rgba(8,17,31,0.09)',
        }}
      >
        {/* Header com drag handle */}
        <div
          className="drag-handle flex shrink-0 cursor-grab items-start justify-between gap-3 border-b px-5 py-4 active:cursor-grabbing"
          style={{
            backgroundColor: 'var(--card-header-bg)',
            borderColor: 'var(--card-header-border)',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
          }}
        >
          <div className="flex items-start gap-2 min-w-0">
            <FontAwesomeIcon
              icon={faGripVertical}
              className="mt-0.5 shrink-0 text-xs opacity-25"
              style={{ color: 'var(--card-header-text)' }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--card-header-text)' }}>
                {title}
              </p>
              {description && (
                <p className="mt-0.5 text-xs leading-snug line-clamp-1" style={{ color: 'var(--card-header-text-muted)' }}>
                  {description}
                </p>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>

        {/* Conteúdo do card */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
});

export default DashboardCard;
