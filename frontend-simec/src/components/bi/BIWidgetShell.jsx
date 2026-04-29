import React, { forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faCompress, faGripVertical } from '@fortawesome/free-solid-svg-icons';

const BIWidgetShell = forwardRef(function BIWidgetShell(
  { title, description, expanded = false, onToggleExpand, children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...rest },
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
        className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div
          className="drag-handle flex shrink-0 cursor-grab items-start justify-between gap-3 border-b px-5 py-4 active:cursor-grabbing"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <div className="flex min-w-0 items-start gap-2">
            <FontAwesomeIcon
              icon={faGripVertical}
              className="mt-0.5 shrink-0 text-xs opacity-30"
              style={{ color: 'var(--text-muted)' }}
            />
            <div className="min-w-0">
              <h2
                className="text-base font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          {onToggleExpand && (
            <button
              type="button"
              title={expanded ? 'Recolher widget' : 'Expandir widget'}
              onClick={onToggleExpand}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
              }}
            >
              <FontAwesomeIcon icon={expanded ? faCompress : faExpand} />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
});

export default BIWidgetShell;
