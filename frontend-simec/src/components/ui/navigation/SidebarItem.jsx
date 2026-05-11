import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * Item de navegação da sidebar — padrão tech-industrial.
 *
 * Estados visuais:
 * - Inativo: bg transparente, texto muted, ícone num quadrado neutro
 * - Hover:   bg branco-translúcido 7%, texto sidebar (mais claro)
 * - Ativo:   bg azul saturado, texto branco, ícone num quadrado
 *            branco-translúcido, sombras internas sutis, barra
 *            lateral branca de 3px (via CSS em index.css aproveitando
 *            o aria-current=page que o NavLink gera).
 */
function SidebarItem({
  item,
  onClick,
  badgeCount = 0,
}) {
  const navLinkClass =
    'sidebar-nav-item relative flex items-center gap-2.5 rounded-lg pl-3 pr-2.5 py-2 ' +
    'text-[13.5px] font-semibold min-w-0 transition-all duration-150';

  const getNavLinkStyle = ({ isActive }) => {
    if (isActive) {
      return {
        backgroundColor: 'var(--bg-sidebar-active)',
        color: 'var(--text-sidebar-active)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
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
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
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
      {({ isActive }) => (
        <>
          {/* Ícone num quadrado discreto, ganha contraste no estado ativo */}
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12.5px] transition-colors"
            style={{
              backgroundColor: isActive
                ? 'rgba(255, 255, 255, 0.14)'
                : 'rgba(255, 255, 255, 0.045)',
              color: isActive
                ? 'var(--text-sidebar-active)'
                : 'var(--text-sidebar-muted)',
            }}
          >
            <FontAwesomeIcon icon={item.icon} />
          </span>

          <span
            className="min-w-0 flex-1 truncate"
            style={{ letterSpacing: '-0.005em' }}
          >
            {item.label}
          </span>

          {item.showBadge && badgeCount > 0 && (
            <span
              className="ml-auto inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                paddingTop: 2, paddingBottom: 2,
                backgroundColor: 'var(--color-danger)',
                color: 'var(--text-inverse)',
              }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </>
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
