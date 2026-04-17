import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import { useAlertasRealtime } from '@/hooks/alertas/useAlertasRealtime';

import logoSimec from '@/assets/images/logo-simec.png';

import SidebarItem from './SidebarItem';
import { sidebarConfig } from './sidebarConfig';

function Sidebar({
  notificacoesCount = 0,
  isMobileOpen = false,
  onClose = () => {},
}) {
  const { usuario } = useAuth();
  const { naoVistos } = useAlertasRealtime({ enabled: true });

  const badgeCountFinal = naoVistos ?? notificacoesCount ?? 0;

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
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center justify-between px-3 pt-4 lg:justify-center">
          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center rounded-2xl border px-3 py-4 transition"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border-soft)',
            }}
          >
            <img
              src={logoSimec}
              alt="SIMEC Logo"
              className="max-h-[200px] max-w-[170px] object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border transition lg:hidden"
            aria-label="Fechar menu lateral"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--bg-surface-soft)',
              color: 'var(--text-secondary)',
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto px-3 pb-6">
          <nav>
            <ul className="space-y-2">
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
              <div
                className="mt-6 border-t pt-6"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <ul className="space-y-2">
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

export default Sidebar;