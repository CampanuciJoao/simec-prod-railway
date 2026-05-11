import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function SidebarItem({
  item,
  onClick,
  badgeCount = 0,
}) {
  const navLinkClass = ({ isActive }) =>
    [
      'sidebar-nav-item relative flex items-center gap-3 rounded-xl pl-4 pr-3 py-2.5',
      'text-sm font-medium transition-colors duration-150',
      'min-w-0',
      isActive ? 'shadow-sm' : '',
    ].join(' ');

  const getNavLinkStyle = ({ isActive }) => {
    if (isActive) {
      return {
        backgroundColor: 'var(--bg-sidebar-active)',
        color: 'var(--text-sidebar-active)',
      };
    }
    return {
      backgroundColor: 'transparent',
      color: 'var(--text-sidebar-muted)',
    };
  };

  return (
    <NavLink
      to={item.path}
      className={navLinkClass}
      style={getNavLinkStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        const active = e.currentTarget.getAttribute('aria-current') === 'page';
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.color = 'var(--text-sidebar)';
        }
      }}
      onMouseLeave={(e) => {
        const active = e.currentTarget.getAttribute('aria-current') === 'page';
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-sidebar-muted)';
        }
      }}
    >
      <span className="inline-flex w-4 shrink-0 items-center justify-center">
        <FontAwesomeIcon icon={item.icon} />
      </span>

      <span className="min-w-0 flex-1 truncate">
        {item.label}
      </span>

      {item.showBadge && badgeCount > 0 && (
        <span
          className="ml-auto inline-flex min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            backgroundColor: 'var(--color-danger)',
            color: 'var(--text-inverse)',
          }}
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </NavLink>
  );
}

SidebarItem.propTypes = {
  item: PropTypes.shape({
    path: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.object.isRequired,
    showBadge: PropTypes.bool,
  }).isRequired,
  onClick: PropTypes.func,
  badgeCount: PropTypes.number,
};

export default SidebarItem;
