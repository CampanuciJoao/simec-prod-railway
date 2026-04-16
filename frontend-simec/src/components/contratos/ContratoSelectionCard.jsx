import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function ContratoSelectionCard({
  title,
  icon,
  emptyMessage,
  items,
  selectedIds,
  onToggle,
  renderLabel,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FontAwesomeIcon icon={icon} className="text-slate-500" />
        {title}
      </h4>

      <div className="max-h-[280px] overflow-y-auto pr-1">
        {items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={[
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition',
                    checked
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <div className="min-w-0 text-sm text-slate-700">
                    {renderLabel(item)}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

ContratoSelectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.object.isRequired,
  emptyMessage: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  selectedIds: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
  renderLabel: PropTypes.func.isRequired,
};

export default ContratoSelectionCard;