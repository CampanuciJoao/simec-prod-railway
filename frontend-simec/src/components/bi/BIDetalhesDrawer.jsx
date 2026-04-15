import React from 'react';

import Drawer from '@/components/ui/overlays/Drawer';
import DrawerList from '@/components/ui/overlays/DrawerList';
import Button from '@/components/ui/primitives/Button';

function BIDetalhesDrawer({
  open,
  onClose,
  title,
  subtitle,
  stats = [],
  actionLabel,
  onAction,
  items = [],
}) {
  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {stats.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.map((stat, index) => (
            <div
              key={`${stat.label}-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {actionLabel ? (
        <div className="mb-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}

      <DrawerList
        items={items}
        emptyMessage="Nenhum dado disponível para esta visualização."
      />
    </Drawer>
  );
}

export default BIDetalhesDrawer;