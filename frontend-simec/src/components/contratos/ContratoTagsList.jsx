import React from 'react';
import PropTypes from 'prop-types';

function ContratoTagsList({ items = [], emptyMessage, renderLabel }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          {renderLabel(item)}
        </span>
      ))}
    </div>
  );
}

ContratoTagsList.propTypes = {
  items: PropTypes.array,
  emptyMessage: PropTypes.string.isRequired,
  renderLabel: PropTypes.func.isRequired,
};

export default ContratoTagsList;