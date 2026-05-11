import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';

import logoSimec from '@/assets/images/logo-simec.png';

import SidebarItem from './SidebarItem';
import { sidebarConfig } from './sidebarConfig';

function Sidebar({
  notificacoesCount = 0,
  isMobileOpen = false,
  onClose = () => {},
}) {
  const { usuario } = useAuth();

  const badgeCountFinal = notificacoesCount ?? 0;

  const { mainItems, adminItems } = useMemo(() => {
    const isAllowed = (item) => {
      if (!item.roles?.length) return true;
      return item.roles.includes(usuario?.role);
    };

    return {
      mainItems: sidebarConfig.filter(
        (item) => !item.section && isAllowed(item)
      ),
      adminItems: sidebarConfig.filter(
        (item) => item.section === 'admin' && isAllowed(item)
      ),
    };
  }, [usuario?.role]);

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Fechar menu"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
        />
      )}

      <aside
        className={[
          'app-sidebar fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col transition-transform duration-300 lg:sticky lg:z-20',
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-soft)',
          color: 'var(--text-sidebar)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Faixa colorida superior — alinha com KpiCard e PageHeader */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)',
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Bloco identidade — logo + eyebrow técnico */}
        <div className="px-3 pt-5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/dashboard"
              className="block flex-1 overflow-hidden rounded-xl border transition"
              onClick={onClose}
              style={{
                backgroundColor: 'var(--bg-sidebar-soft)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <img
                src={logoSimec}
                alt="SIMEC Logo"
                className="w-full object-cover"
              />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition lg:hidden"
              aria-label="Fechar menu lateral"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.12)',
                backgroundColor: 'var(--bg-sidebar-soft)',
                color: 'var(--text-sidebar-muted)',
              }}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Nav — seção principal */}
        <div className="scrollbar-none flex-1 overflow-y-auto px-3 pb-4">
          <SectionEyebrow label="/ Navegação" />

          <nav>
            <ul className="space-y-1">
              {mainItems.map((item) => (
                <li key={item.path}>
                  <SidebarItem
                    item={item}
                    onClick={onClose}
                    badgeCount={item.showBadge ? badgeCountFinal : 0}
                  />
                </li>
              ))}
            </ul>

            {adminItems.length > 0 && (
              <div className="mt-5">
                <SectionEyebrow label="/ Admin" />
                <ul className="space-y-1">
                  {adminItems.map((item) => (
                    <li key={item.path}>
                      <SidebarItem item={item} onClick={onClose} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}

/**
 * Eyebrow monospace uppercase usado como header de seção dentro da sidebar.
 * Aplica o mesmo padrão visual dos PageSection/PageHeader.
 */
function SectionEyebrow({ label }) {
  return (
    <p
      className="px-3 py-2 mb-1"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--text-sidebar-muted)',
        opacity: 0.6,
      }}
    >
      {label}
    </p>
  );
}

export default Sidebar;
