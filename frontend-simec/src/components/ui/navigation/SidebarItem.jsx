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
      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
      'min-w-0 border',
      isActive ? 'shadow-sm' : '',
    ].join(' ');

  const getNavLinkStyle = ({ isActive }) => {
    if (isActive) {
      return {
        backgroundColor: 'var(--brand-primary)',
        color: 'var(--text-inverse)',
        borderColor: 'transparent',
      };
    }

    return {
      backgroundColor: 'transparent',
      color: 'var(--text-sidebar-muted)',
      borderColor: 'transparent',
    };
  };

  return (
    <NavLink
      to={item.path}
      className={navLinkClass}
      style={getNavLinkStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        const isActive =
          e.currentTarget.getAttribute('aria-current') === 'page';

        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)';
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--border-soft)';
        }
      }}
      onMouseLeave={(e) => {
        const isActive =
          e.currentTarget.getAttribute('aria-current') === 'page';

        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-sidebar-muted)';
          e.currentTarget.style.borderColor = 'transparent';
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
