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
      className="px-4 py-3 sm:px-6"
      style={{
        backgroundColor: 'var(--bg-topbar)',
        color: 'var(--text-topbar)',
        borderBottom: '4px solid var(--brand-accent)',
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

            {/* Marca SIMEC bauhaus */}
            <div className="flex items-center gap-2.5 mr-2 hidden sm:flex">
              <span
                style={{
                  position: 'relative',
                  width: 18,
                  height: 18,
                  background: 'var(--brand-accent)',
                  display: 'inline-block',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    width: 8,
                    height: 8,
                    background: 'var(--color-danger)',
                    left: 5,
                    top: 5,
                  }}
                />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: '-0.04em',
                  color: 'var(--text-topbar)',
                }}
              >
                SIMEC
              </span>
              <span
                className="hidden md:inline"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--text-topbar-muted)',
                  marginLeft: 6,
                  paddingLeft: 10,
                  borderLeft: '1px solid var(--brand-topbar-border)',
                }}
              >
                gestão · manutenção
              </span>
            </div>

            <div className="min-w-0 ml-auto sm:ml-4 hidden md:block">
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--text-topbar-muted)',
                }}
              >
                Olá
              </p>
              <h2
                className="truncate"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '-0.01em',
                  color: 'var(--text-topbar)',
                  marginTop: 1,
                }}
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
