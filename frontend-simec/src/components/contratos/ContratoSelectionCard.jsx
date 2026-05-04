import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function SelectionItem({ item, checked, onToggle, renderLabel }) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition"
      style={{
        backgroundColor: checked ? 'var(--brand-primary-soft)' : 'var(--bg-surface-soft)',
        borderColor: checked ? 'var(--brand-primary)' : 'var(--border-soft)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
        className="mt-1 h-4 w-4 rounded"
        style={{ accentColor: 'var(--brand-primary)' }}
      />
      <div
        className="min-w-0 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        {renderLabel(item)}
      </div>
    </label>
  );
}

function ContratoSelectionCard({
  title,
  icon,
  emptyMessage,
  items = [],
  groups,
  selectedIds,
  onToggle,
  renderLabel,
}) {
  const isGrouped = Array.isArray(groups) && groups.length > 0;
  const activeGroups = isGrouped ? groups.filter((g) => g.items.length > 0) : [];
  const hasContent = isGrouped ? activeGroups.length > 0 : items.length > 0;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-soft)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h4
        className="mb-3 flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        <FontAwesomeIcon icon={icon} style={{ color: 'var(--text-muted)' }} />
        {title}
      </h4>

      <div className="max-h-[320px] overflow-y-auto pr-1">
        {hasContent ? (
          isGrouped ? (
            <div className="flex flex-col gap-4">
              {activeGroups.map((group) => (
                <div key={group.id}>
                  <div
                    className="sticky top-0 z-10 mb-2 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                    style={{
                      backgroundColor: 'var(--bg-surface-soft)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {group.label}
                  </div>

                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <SelectionItem
                        key={item.id}
                        item={item}
                        checked={selectedIds.includes(item.id)}
                        onToggle={onToggle}
                        renderLabel={renderLabel}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <SelectionItem
                  key={item.id}
                  item={item}
                  checked={selectedIds.includes(item.id)}
                  onToggle={onToggle}
                  renderLabel={renderLabel}
                />
              ))}
            </div>
          )
        ) : (
          <div
            className="rounded-xl border border-dashed p-6 text-center text-sm"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: 'var(--bg-surface-soft)',
              color: 'var(--text-muted)',
            }}
          >
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
  items: PropTypes.array,
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      items: PropTypes.array.isRequired,
    })
  ),
  selectedIds: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
  renderLabel: PropTypes.func.isRequired,
};

export default ContratoSelectionCard;
