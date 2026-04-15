import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function AlertListItem({ alerta }) {
  const prioridadeCor =
    alerta?.prioridade === 'Alta'
      ? 'bg-red-500'
      : alerta?.prioridade === 'Media'
        ? 'bg-amber-400'
        : 'bg-slate-400';

  return (
    <Link
      to={alerta?.link || '/alertas'}
      className="flex items-center gap-3 border-b border-slate-200 py-3 last:border-b-0 hover:bg-slate-50"
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${prioridadeCor}`} />
      <span className="line-clamp-1 text-sm text-slate-700 hover:text-blue-600">
        {alerta?.titulo || 'Alerta sem título'}
      </span>
    </Link>
  );
}

AlertListItem.propTypes = {
  alerta: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    titulo: PropTypes.string,
    prioridade: PropTypes.string,
    link: PropTypes.string,
  }).isRequired,
};

export default AlertListItem;