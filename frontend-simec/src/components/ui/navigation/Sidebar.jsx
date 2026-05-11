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
          'fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r transition-transform duration-300 lg:sticky lg:z-20',
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-sidebar)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center justify-between px-3 pt-4 lg:justify-center">
          <Link
            to="/dashboard"
            className="block w-full overflow-hidden rounded-2xl border transition"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-sidebar-soft)',
              borderColor: 'var(--border-soft)',
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
            className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border transition lg:hidden"
            aria-label="Fechar menu lateral"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--bg-sidebar-soft)',
              color: 'var(--text-sidebar-muted)',
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="scrollbar-none mt-5 flex-1 overflow-y-auto px-3 pb-3">
          <nav>
            <ul className="space-y-1.5">
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
                {/* Eyebrow 'Admin' separa a seção administrativa */}
                <p
                  className="mb-2 px-4"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: 'var(--text-sidebar-muted)',
                    opacity: 0.55,
                  }}
                >
                  · Admin
                </p>
                <div
                  className="border-t pt-2"
                  style={{ borderColor: 'var(--border-soft)', opacity: 0.5 }}
                />
                <ul className="space-y-1.5 mt-2">
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

        {/* Footer técnico — usuário, role, versão e status */}
        <div
          className="px-3 py-3 space-y-1.5"
          style={{ borderTop: '1px solid var(--border-soft)' }}
        >
          {usuario?.nome && (
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <span
                className="truncate"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--text-sidebar)',
                }}
                title={usuario.nome}
              >
                {usuario.nome}
              </span>
              {usuario.role && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    padding: '2px 5px',
                    borderRadius: 3,
                    backgroundColor: usuario.role === 'superadmin'
                      ? 'rgba(220, 38, 38, 0.18)'
                      : usuario.role === 'admin'
                        ? 'rgba(37, 99, 235, 0.22)'
                        : 'rgba(255, 255, 255, 0.08)',
                    color: usuario.role === 'superadmin'
                      ? '#fca5a5'
                      : usuario.role === 'admin'
                        ? '#93c5fd'
                        : 'var(--text-sidebar-muted)',
                  }}
                >
                  {usuario.role}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                color: 'var(--text-sidebar-muted)',
              }}
            >
              SIMEC v4.2.1
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-success)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: 'var(--color-success)',
                  boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.2)',
                }}
              />
              Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
