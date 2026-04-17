import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

import NotificationsPanel from '@/components/ui/overlays/NotificationsPanel';
import { ActionBar, Button, ThemeModeToggle } from '@/components/ui';

function AppTopbar({
  nomeUsuario,
  alertsOpen,
  alertas,
  alertasLoading,
  contadorNaoVistos,
  alertsRef,
  onOpenMenu,
  onToggleAlerts,
  onCloseAlerts,
  onLogout,
  onOpenAlert,
  onMarkAsRead,
  onDismiss,
}) {
  return (
    <header
      className="border-b px-4 py-4 sm:px-6"
      style={{
        borderColor: 'var(--brand-topbar-border)',
        backgroundColor: 'var(--bg-topbar)',
        color: 'var(--text-topbar)',
      }}
    >
      <ActionBar
        stackedOnMobile
        left={
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="lg:hidden"
              onClick={onOpenMenu}
              aria-label="Abrir menu"
              title="Abrir menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </Button>

            <div className="min-w-0">
              <p
                className="text-sm"
                style={{ color: 'var(--text-topbar-muted)' }}
              >
                Olá,
              </p>
              <h2
                className="truncate font-semibold"
                style={{ color: 'var(--text-topbar)' }}
              >
                {nomeUsuario}
              </h2>
            </div>
          </div>
        }
        right={
          <>
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

            <ThemeModeToggle />

            <Button
              type="button"
              variant="secondary"
              onClick={onLogout}
              title="Sair"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </>
        }
      />
    </header>
  );
}

AppTopbar.propTypes = {
  nomeUsuario: PropTypes.string.isRequired,
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
  onLogout: PropTypes.func.isRequired,
  onOpenAlert: PropTypes.func.isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default AppTopbar;