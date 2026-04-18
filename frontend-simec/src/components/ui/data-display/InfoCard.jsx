import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Card from '@/components/ui/primitives/Card';

function InfoCard({
  icon,
  label,
  value,
  fullWidth = false,
  className = '',
}) {
  return (
    <Card
      surface="soft"
      className={[
        'rounded-xl',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
        className,
      ].join(' ')}
      padded
    >
      <div
        className="flex items-center gap-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {icon ? (
          <FontAwesomeIcon icon={icon} className="text-xs" />
        ) : null}

        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <div
        className="mt-2 break-words text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {value || 'N/A'}
      </div>
    </Card>
  );
}

InfoCard.propTypes = {
  icon: PropTypes.object,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};

export default InfoCard;