import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Card from '../ui/primitives/Card';

function CadastroNavigationCard({
  icon,
  title,
  description,
  onClick,
  tone = 'blue',
  className = '',
}) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left transition hover:-translate-y-0.5 hover:shadow-md',
        className,
      ].join(' ')}
    >
      <Card className="h-full">
        <div className="flex flex-col gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.blue,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </button>
  );
}

CadastroNavigationCard.propTypes = {
  icon: PropTypes.any.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  tone: PropTypes.oneOf(['blue', 'green', 'yellow', 'slate', 'red']),
  className: PropTypes.string,
};

export default CadastroNavigationCard;