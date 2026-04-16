import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faMoon,
  faRightFromBracket,
  faSun,
} from '@fortawesome/free-solid-svg-icons';

import NotificationsPanel from '@/components/ui/overlays/NotificationsPanel';

function AppTopbar({
  nomeUsuario,
  isDarkMode,
  alertsOpen,
  alertas,
  alertasLoading,
  contadorNaoVistos,
  alertsRef,
  onOpenMenu,
  onToggleAlerts,
  onCloseAlerts,
  onToggleDarkMode,
  onLogout,
  onOpenAlert,
  onMarkAsRead,
  onDismiss,
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900 px-4 py-4 text-white sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white lg:hidden"
            aria-label="Abrir menu"
            title="Abrir menu"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>

          <div className="min-w-0">
            <p className="text-sm text-slate-300">Olá,</p>
            <h2 className="truncate font-semibold text-white">{nomeUsuario}</h2>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div ref={alertsRef}>
            <NotificationsPanel
              open={alertsOpen}
              alertas={alertas}
              loading={alertasLoading}
              contadorNaoVistos={contadorNaoVistos}
              onToggle={onToggleAlerts}
              onClose={onCloseAlerts}
              onOpenAlert={onOpenAlert}
              onMarkAsRead={onMarkAsRead}
              onDismiss={onDismiss}
            />
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
            title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
            aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200 transition hover:bg-red-600 hover:text-white"
            title="Sair"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}

AppTopbar.propTypes = {
  nomeUsuario: PropTypes.string.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  alertsOpen: PropTypes.bool.isRequired,
  alertas: PropTypes.array,
  alertasLoading: PropTypes.bool,
  contadorNaoVistos: PropTypes.number,
  alertsRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
  onOpenMenu: PropTypes.func.isRequired,
  onToggleAlerts: PropTypes.func.isRequired,
  onCloseAlerts: PropTypes.func.isRequired,
  onToggleDarkMode: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  onOpenAlert: PropTypes.func.isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default AppTopbar;