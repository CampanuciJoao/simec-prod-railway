// src/components/ui/PageSection.jsx

import React from 'react';

function PageSection({
  children,
  title,
  actions,
  className = '',
  variant = 'default',
  noPadding = false,
}) {
  const baseClass = 'page-section rounded-2xl border shadow-sm';

  const variants = {
    default: 'bg-white border-slate-200',
    transparent: 'bg-transparent border-none shadow-none',
    muted: 'bg-slate-50 border-slate-200',
  };

  const paddingClass = noPadding ? '' : ' p-6';

  return (
    <section
      className={`${baseClass} ${variants[variant]}${paddingClass} ${className}`.trim()}
    >
      {(title || actions) && (
        <div className="flex justify-between items-center mb-6">
          {title && (
            <h2 className="text-sm font-bold uppercase text-slate-600 tracking-wide">
              {title}
            </h2>
          )}

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {children}
    </section>
  );
}

export default PageSection;