import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Sidebar from '@/components/ui/navigation/Sidebar';
import ChatBot from '@/components/ui/chat/ChatBot';
import AppBreadcrumb from '@/components/layouts/AppBreadcrumb';
import AppTopbar from '@/components/layouts/AppTopbar';

import { useAuth } from '@/contexts/AuthContext';
import { useAlertas } from '@/contexts/AlertasContext';
import { getBreadcrumbItems } from '@/utils/breadcrumbConfig';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const auth = useAuth?.();
  const usuario = auth?.usuario || auth?.user || null;
  const logout = auth?.logout || auth?.signOut || null;

  const {
    alertas = [],
    loading: alertasLoading,
    updateStatus,
    dismissAlerta,
  } = useAlertas();

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const alertsRef = useRef(null);

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

  const breadcrumbItems = useMemo(() => {
    return getBreadcrumbItems(location.pathname);
  }, [location.pathname]);

  const nomeUsuario =
    usuario?.nome ||
    usuario?.name ||
    usuario?.username ||
    'Administrador do Sistema';

  const contadorNaoVistos = useMemo(() => {
    return alertas.filter((alerta) => alerta.status === 'NaoVisto').length;
  }, [alertas]);

  const handleToggleAlerts = useCallback(() => {
    setAlertsOpen((prev) => !prev);
  }, []);

  const handleCloseAlerts = useCallback(() => {
    setAlertsOpen(false);
  }, []);

  const handleOpenMobileMenu = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      if (typeof logout === 'function') {
        await logout();
      }
    } catch (error) {
      console.error('[APP_LAYOUT_LOGOUT_ERROR]', error);
    } finally {
      navigate('/login');
    }
  }, [logout, navigate]);

  const handleOpenAlertDetails = useCallback(
    async (alerta) => {
      try {
        if (alerta?.status === 'NaoVisto') {
          await updateStatus(alerta.id, 'Visto');
        }
      } catch (error) {
        console.error('[APP_LAYOUT_ALERT_STATUS_ERROR]', error);
      } finally {
        setAlertsOpen(false);
        navigate(alerta?.link || '/alertas');
      }
    },
    [navigate, updateStatus]
  );

  const handleMarkAsRead = useCallback(
    async (alertaId) => {
      try {
        await updateStatus(alertaId, 'Visto');
      } catch (error) {
        console.error('[APP_LAYOUT_MARK_READ_ERROR]', error);
      }
    },
    [updateStatus]
  );

  const handleDismiss = useCallback(
    async (alertaId) => {
      try {
        await dismissAlerta(alertaId);
      } catch (error) {
        console.error('[APP_LAYOUT_DISMISS_ERROR]', error);
      }
    },
    [dismissAlerta]
  );

  return (
    <>
      <div
        className="flex min-h-screen"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        <Sidebar
          notificacoesCount={contadorNaoVistos}
          isMobileOpen={isMobileSidebarOpen}
          onClose={handleCloseMobileMenu}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            nomeUsuario={nomeUsuario}
            alertsOpen={alertsOpen}
            alertas={alertas}
            alertasLoading={alertasLoading}
            contadorNaoVistos={contadorNaoVistos}
            alertsRef={alertsRef}
            onOpenMenu={handleOpenMobileMenu}
            onToggleAlerts={handleToggleAlerts}
            onCloseAlerts={handleCloseAlerts}
            onLogout={handleLogout}
            onOpenAlert={handleOpenAlertDetails}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismiss}
          />

          <AppBreadcrumb items={breadcrumbItems} />

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <ChatBot />
      </div>
    </>
  );
}

export default AppLayout;