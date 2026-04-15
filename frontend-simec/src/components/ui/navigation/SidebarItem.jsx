import React from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function SidebarItem({
  item,
  onClick,
  badgeCount = 0,
}) {
  const navLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
    ].join(' ');

  return (
    <NavLink
      to={item.path}
      className={navLinkClass}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={item.icon} className="w-4" />
      <span>{item.label}</span>

      {item.showBadge && badgeCount > 0 && (
        <span className="ml-auto inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </NavLink>
  );
}

export default SidebarItem;