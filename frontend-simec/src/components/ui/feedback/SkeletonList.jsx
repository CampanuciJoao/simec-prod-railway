import React from 'react';
import PropTypes from 'prop-types';

function SkeletonRow({ cols = 3 }) {
  const widths = ['w-1/4', 'w-1/2', 'w-1/3', 'w-2/5', 'w-3/5'];
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {Array.from({ length: cols }, (_, i) => (
        <div
          key={i}
          className={`h-3.5 animate-pulse rounded bg-slate-200 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

function SkeletonList({ rows = 5, cols = 3, className = '' }) {
  return (
    <div className={`divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

SkeletonList.propTypes = {
  rows: PropTypes.number,
  cols: PropTypes.number,
  className: PropTypes.string,
};

export default SkeletonList;
