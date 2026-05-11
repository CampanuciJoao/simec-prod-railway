import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

import {
  ActionBar,
  Button,
  NotificationsPanel,
  ThemeModeToggle,
} from '@/components/ui';

function AppTopbar({
  nomeUsuario,
  alertsOpen,
  alertas,
  alertasLoading,
  contadorNaoVistos,
  sseConnected,
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
      className="border-b px-4 py-3 sm:px-6"
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

            {/* Chip identidade SIMEC — visível apenas em md+ */}
            <div
              className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: sseConnected ? 'var(--color-success)' : 'var(--color-warning)',
                  boxShadow: sseConnected ? '0 0 0 2px rgba(5, 150, 105, 0.25)' : '0 0 0 2px rgba(217, 119, 6, 0.25)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--text-topbar)',
                }}
              >
                SIMEC
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'var(--text-topbar-muted)',
                  opacity: 0.7,
                }}
              >
                v4.2.1
              </span>
            </div>

            <div className="min-w-0">
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-topbar-muted)',
                }}
              >
                Sessão
              </p>
              <h2
                className="truncate font-semibold leading-tight mt-0.5"
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
                sseConnected={sseConnected}
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
  sseConnected: PropTypes.bool,
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
