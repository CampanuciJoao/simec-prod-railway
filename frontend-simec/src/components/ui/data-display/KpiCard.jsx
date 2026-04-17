import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Card from '@/components/ui/primitives/Card';

const toneMap = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  yellow: 'bg-amber-100 text-amber-600',
  orange: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-violet-100 text-violet-600',
};

function KpiCard({
  icon,
  title,
  value,
  subtitle = '',
  tone = 'slate',
  onClick,
  className = '',
}) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full text-left',
        onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md' : '',
        className,
      ].join(' ')}
    >
      <Card className="h-full">
        <div className="flex items-start gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.slate,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>

            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </Card>
    </Wrapper>
  );
}

KpiCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  tone: PropTypes.oneOf([
    'slate',
    'blue',
    'green',
    'yellow',
    'orange',
    'red',
    'purple',
  ]),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default KpiCard;