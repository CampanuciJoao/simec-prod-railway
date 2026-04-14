import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

function DrawerListItem({ item, index }) {
  const Wrapper = item.onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={item.onClick ? 'button' : undefined}
      onClick={item.onClick}
      className={[
        'w-full px-4 py-4 text-left',
        item.onClick
          ? 'transition hover:bg-slate-50'
          : 'bg-white',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faCircleInfo} className="text-xs" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">
                {item.title}
              </div>

              {item.subtitle ? (
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {item.subtitle}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900">{item.value}</div>
            {item.badge ? (
              <div className="mt-1">
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {item.badge}
                </span>
              </div>
            ) : null}
          </div>

          {item.onClick ? (
            <span className="text-slate-400">
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </span>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

function DrawerList({
  items = [],
  emptyMessage = 'Nenhum dado disponível.',
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {items.map((item, index) => (
          <DrawerListItem
            key={`${item.title}-${index}`}
            item={item}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default DrawerList;