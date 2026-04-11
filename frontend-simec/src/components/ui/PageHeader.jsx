import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function PageHeader({ title, subtitle, icon, actions }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={icon} />
          </span>
        )}

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;