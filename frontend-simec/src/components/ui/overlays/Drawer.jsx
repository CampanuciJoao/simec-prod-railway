import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  widthClass = 'w-full sm:w-[460px] lg:w-[560px]',
  children,
  footer = null,
}) {
  return (
    <>
      <div
        className={[
          'fixed inset-0 z-[85] bg-slate-950/50 transition-opacity',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      <aside
        className={[
          'fixed right-0 top-0 z-[90] flex h-screen flex-col shadow-2xl transition-transform duration-300',
          widthClass,
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-soft)',
        }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div
          className="shrink-0 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition"
              style={{
                borderColor: 'var(--border-soft)',
                color: 'var(--text-muted)',
                backgroundColor: 'transparent',
              }}
              aria-label="Fechar painel"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div
            className="shrink-0 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            {footer}
          </div>
        ) : null}
      </aside>
    </>
  );
}

export default Drawer;
