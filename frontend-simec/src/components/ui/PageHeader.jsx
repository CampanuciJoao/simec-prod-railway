import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className = '',
}) {
  return (
    <div
      className={[
        'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        'mb-6 md:mb-8', // 👈 AQUI ESTÁ A CORREÇÃO PRINCIPAL
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={icon} />
          </div>
        )}

        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            {title}
          </h1>

          {subtitle && (
            <p className="text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;