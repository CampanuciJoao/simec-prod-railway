import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function PageHeader({
  title,
  icon,
  actions,
  variant = 'default',
}) {
  const baseStyle =
    'flex justify-between items-center p-4 rounded-xl shadow-lg mb-8';

  const variants = {
    default: 'bg-[#1e293b] text-white',
    light: 'bg-white border border-slate-200',
  };

  return (
    <div className={`${baseStyle} ${variants[variant]}`}>
      <h1 className="text-lg font-bold uppercase flex items-center gap-2">
        {icon && <FontAwesomeIcon icon={icon} />}
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  );
}

export default PageHeader;