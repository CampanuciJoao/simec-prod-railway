import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Sidebar from '../ui/navigation/Sidebar';
import ChatBot from '../ui/chat/ChatBot';
import AppBreadcrumb from './AppBreadcrumb';
import AppTopbar from './AppTopbar';

import { useAuth } from '../../contexts/AuthContext';
import { useAlertas } from '../../contexts/AlertasContext';
import { getBreadcrumbItems } from '../../utils/breadcrumbConfig';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const auth = useAuth?.();
  const user = auth?.user || auth?.usuario || null;
  const logout = auth?.logout || auth?.signOut || null;

  const {
    alertas = [],
    loading: alertasLoading,
    updateStatus,
    dismissAlerta,
  } = useAlertas();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('simec-theme') === 'dark';
  });

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const alertsRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;

    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('simec-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('simec-theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setAlertsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setAlertsOpen(false);
        setIsMobileSidebarOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setAlertsOpen(false);
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const breadcrumbItems = useMemo(
    () => getBreadcrumbItems(location.pathname),
    [location.pathname]
  );

  const nomeUsuario =
    user?.nome || user?.name || user?.username || 'Administrador do Sistema';

  const alertasNaoVistos = useMemo(
    () => alertas.filter((alerta) => alerta.status === 'NaoVisto'),
    [alertas]
  );

  const contadorNaoVistos = alertasNaoVistos.length;

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleToggleAlerts = () => {
    setAlertsOpen((prev) => !prev);
  };

  const handleCloseAlerts = () => {
    setAlertsOpen(false);
  };

  const handleOpenMobileMenu = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleCloseMobileMenu = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      if (typeof logout === 'function') {
        await logout();
      }
    } catch (error) {
      console.error('[APP_LAYOUT_LOGOUT_ERROR]', error);
    } finally {
      navigate('/login');
    }
  };

  const handleOpenAlertDetails = async (alerta) => {
    try {
      if (alerta.status === 'NaoVisto') {
        await updateStatus(alerta.id, 'Visto');
      }
    } catch (error) {
      console.error('[APP_LAYOUT_ALERT_STATUS_ERROR]', error);
    } finally {
      setAlertsOpen(false);
      navigate(alerta.link || '/alertas');
    }
  };

  const handleMarkAsRead = async (alertaId) => {
    try {
      await updateStatus(alertaId, 'Visto');
    } catch (error) {
      console.error('[APP_LAYOUT_MARK_READ_ERROR]', error);
    }
  };

  const handleDismiss = async (alertaId) => {
    try {
      await dismissAlerta(alertaId);
    } catch (error) {
      console.error('[APP_LAYOUT_DISMISS_ERROR]', error);
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
        <Sidebar
          notificacoesCount={contadorNaoVistos}
          isMobileOpen={isMobileSidebarOpen}
          onClose={handleCloseMobileMenu}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            nomeUsuario={nomeUsuario}
            isDarkMode={isDarkMode}
            alertsOpen={alertsOpen}
            alertas={alertas}
            alertasLoading={alertasLoading}
            contadorNaoVistos={contadorNaoVistos}
            alertsRef={alertsRef}
            onOpenMenu={handleOpenMobileMenu}
            onToggleAlerts={handleToggleAlerts}
            onCloseAlerts={handleCloseAlerts}
            onToggleDarkMode={handleToggleDarkMode}
            onLogout={handleLogout}
            onOpenAlert={handleOpenAlertDetails}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismiss}
          />

          <AppBreadcrumb items={breadcrumbItems} />

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <ChatBot />
    </>
  );
}

export default AppLayout;