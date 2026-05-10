import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

import { Card } from '@/components/ui';

function InteractiveKpiCard({ icon, title, value, subtitle, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-amber-100 text-amber-600',
  };

  const inner = (
    <Card padded={false} className="h-full min-h-[80px] p-3">
      <div className="flex h-full flex-col justify-between gap-2">
        <div className="flex items-start gap-2">
          <div
            className={[
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs',
              toneMap[tone] || toneMap.slate,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase leading-tight tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              {title}
            </p>

            <p
              className="mt-1 break-words text-lg font-bold leading-tight tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {value}
            </p>
          </div>
        </div>

        {onClick ? (
          <div
            className="flex items-center gap-1.5 text-[10px] font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            <span>Ver detalhes</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </div>
        ) : subtitle ? (
          <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        ) : null}
      </div>
    </Card>
  );

  if (!onClick) return <div className="h-full">{inner}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {inner}
    </button>
  );
}

InteractiveKpiCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  tone: PropTypes.oneOf(['slate', 'blue', 'green', 'red', 'yellow']),
  onClick: PropTypes.func,
};

export default InteractiveKpiCard;
