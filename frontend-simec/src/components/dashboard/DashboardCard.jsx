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
        className="flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Header com drag handle */}
        <div
          className="drag-handle group flex shrink-0 cursor-grab items-start justify-between gap-3 border-b px-5 py-3.5 active:cursor-grabbing"
          style={{
            backgroundColor: 'var(--card-header-bg)',
            borderColor: 'var(--card-header-border)',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
          }}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <FontAwesomeIcon
              icon={faGripVertical}
              className="mt-1 shrink-0 text-[10px] opacity-30 transition-opacity group-hover:opacity-60"
              style={{ color: 'var(--card-header-text)' }}
            />
            <div className="min-w-0">
              <p
                className="text-[14px] font-semibold leading-tight tracking-[-0.01em]"
                style={{ color: 'var(--card-header-text)' }}
              >
                {title}
              </p>
              {description && (
                <p
                  className="mt-1 text-[11.5px] leading-snug line-clamp-1"
                  style={{ color: 'var(--card-header-text-muted)' }}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>

        {/* Conteúdo do card */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          {children}
        </div>
      </div>
    </div>
  );
});

export default DashboardCard;
