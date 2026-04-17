import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { Card, Badge } from '@/components/ui';

function getPrioridadeVariant(prioridade) {
  if (prioridade === 'Alta') return 'red';
  if (prioridade === 'Media') return 'yellow';
  return 'slate';
}

function AlertListItem({ alerta }) {
  const prioridadeVariant = getPrioridadeVariant(alerta?.prioridade);

  return (
    <Link
      to={alerta?.link || '/alertas'}
      className="block"
    >
      <Card
        padded={false}
        className={[
          'border-b border-slate-200/70 px-4 py-3 transition-all',
          'hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-medium text-slate-800 transition dark:text-slate-100">
              {alerta?.titulo || 'Alerta sem título'}
            </p>
          </div>

          <Badge variant={prioridadeVariant}>
            {alerta?.prioridade || 'Baixa'}
          </Badge>
        </div>
      </Card>
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