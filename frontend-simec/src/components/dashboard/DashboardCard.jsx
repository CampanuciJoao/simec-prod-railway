import React, { forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical } from '@fortawesome/free-solid-svg-icons';

/**
 * Card de dashboard — direção bauhaus contemporâneo.
 * Borda grossa preta, header em tinta com etiqueta amarela.
 * Preserva forwardRef e handlers do react-grid-layout.
 */
const DashboardCard = forwardRef(function DashboardCard(
  { id, title, description, headerRight, children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...rest },
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
        className="flex h-full flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '2px solid var(--border-strong)',
          borderRadius: 0,
        }}
      >
        {/* Header em tinta — drag handle integrada */}
        <div
          className="drag-handle flex shrink-0 cursor-grab items-start justify-between gap-3 px-5 py-3 active:cursor-grabbing"
          style={{
            backgroundColor: 'var(--card-header-bg)',
            color: 'var(--card-header-text)',
            borderBottom: '2px solid var(--border-strong)',
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <FontAwesomeIcon
              icon={faGripVertical}
              className="mt-1 shrink-0 text-[10px] opacity-50"
              style={{ color: 'var(--card-header-text)' }}
            />
            <div className="min-w-0">
              {id && (
                <p
                  className="text-[10px] font-bold uppercase mb-0.5"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.22em',
                    color: 'var(--brand-accent)',
                  }}
                >
                  {id}
                </p>
              )}
              <p
                className="text-[15px] font-bold leading-tight uppercase"
                style={{
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.02em',
                  color: 'var(--card-header-text)',
                }}
              >
                {title}
              </p>
              {description && (
                <p
                  className="mt-1 text-[11px] leading-snug line-clamp-2"
                  style={{
                    color: 'var(--card-header-text-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
});

export default DashboardCard;
