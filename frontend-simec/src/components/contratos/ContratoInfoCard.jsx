import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function ContratoInfoCard({ icon, label, value, fullWidth = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 text-slate-500">
        <FontAwesomeIcon icon={icon} className="text-xs" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <div className="mt-2 break-words text-sm font-medium text-slate-800">
        {value || 'N/A'}
      </div>
    </div>
  );
}

ContratoInfoCard.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  fullWidth: PropTypes.bool,
};

export default ContratoInfoCard;