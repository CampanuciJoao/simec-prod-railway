import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAnglesDown,
  faAnglesUp,
  faDownLong,
  faExpand,
  faCompress,
  faUpLong,
} from '@fortawesome/free-solid-svg-icons';

function ActionButton({ title, onClick, disabled, icon }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}

function BIWidgetShell({
  title,
  description,
  expanded = false,
  canMoveUp = false,
  canMoveDown = false,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  children,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ActionButton
            title="Mover para cima"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            icon={faUpLong}
          />

          <ActionButton
            title="Mover para baixo"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            icon={faDownLong}
          />

          <ActionButton
            title={expanded ? 'Recolher widget' : 'Expandir widget'}
            onClick={onToggleExpand}
            icon={expanded ? faCompress : faExpand}
          />
        </div>
      </div>

      <div className={expanded ? 'p-5' : 'p-5'}>{children}</div>
    </section>
  );
}

export default BIWidgetShell;