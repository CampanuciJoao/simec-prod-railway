import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import ChatBot from '@/components/ui/chat/ChatBot';
import { Sidebar, ImpersonacaoBanner } from '@/components/ui';
import AppBreadcrumb from '@/components/layouts/AppBreadcrumb';
import AppTopbar from '@/components/layouts/AppTopbar';
import GuardiaoAceiteTermos from '@/components/lgpd/GuardiaoAceiteTermos';
import { ModalLembrete } from '@/components/lembretes';

import { useAuth } from '@/contexts/AuthContext';
import { useAlertas } from '@/contexts/AlertasContext';
import { useLembretes } from '@/contexts/LembretesContext';
import { useToast } from '@/contexts/ToastContext';
import {
  concluirLembrete,
  marcarLembreteLido,
  marcarTodosLembretesLidos,
} from '@/services/api';
import { getBreadcrumbItems } from '@/utils/breadcrumbConfig';

const ROTAS_ENTIDADE_LEMBRETE = {
  OS_CORRETIVA: (id) => `/manutencoes/ocorrencia/${id}`,
  EQUIPAMENTO:  (id) => `/equipamentos/detalhes/${id}`,
  UNIDADE:      (id) => `/unidades/${id}`,
  SEGURO:       (id) => `/seguros/detalhes/${id}`,
  CONTRATO:     (id) => `/contratos/detalhes/${id}`,
};

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const auth = useAuth?.();
  const usuario = auth?.usuario || auth?.user || null;
  const logout = auth?.logout || auth?.signOut || null;

  const toast = useToast();

  const {
    alertas = [],
    naoVistos = 0,
    loading: alertasLoading,
    sseConnected = false,
    updateStatus,
    dismissAlerta,
    marcarTodosVistos,
  } = useAlertas();

  const {
    lembretes = [],
    badge: lembretesBadge,
    loading: lembretesLoading,
    recarregar: recarregarLembretes,
  } = useLembretes();

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [modalLembreteOpen, setModalLembreteOpen] = useState(false);

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

  const contadorNaoVistos = useMemo(() => Number(naoVistos || 0), [naoVistos]);

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

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await marcarTodosVistos();
    } catch (error) {
      console.error('[APP_LAYOUT_MARK_ALL_ERROR]', error);
    }
  }, [marcarTodosVistos]);

  // ─── Lembretes — handlers que o painel unificado chama ────────────────────
  const handleOpenLembrete = useCallback(
    async (lembrete) => {
      try {
        if (!lembrete?.lidoEm) await marcarLembreteLido(lembrete.id);
      } catch (err) {
        console.error('[APP_LAYOUT_LEMBRETE_LIDO]', err);
      } finally {
        setAlertsOpen(false);
        if (lembrete?.entidadeTipo && lembrete?.entidadeId) {
          const rota = ROTAS_ENTIDADE_LEMBRETE[lembrete.entidadeTipo];
          if (rota) {
            navigate(rota(lembrete.entidadeId));
            recarregarLembretes?.();
            return;
          }
        }
        navigate('/lembretes');
        recarregarLembretes?.();
      }
    },
    [navigate, recarregarLembretes]
  );

  const handleConcluirLembrete = useCallback(
    async (lembrete) => {
      try {
        await concluirLembrete(lembrete.id);
        toast?.addToast?.('Lembrete concluído.', 'success');
        recarregarLembretes?.();
      } catch (err) {
        toast?.addToast?.(err?.response?.data?.message || 'Erro ao concluir.', 'error');
      }
    },
    [toast, recarregarLembretes]
  );

  const handleMarcarTodosLembretesLidos = useCallback(async () => {
    try {
      await marcarTodosLembretesLidos();
      recarregarLembretes?.();
    } catch (err) {
      toast?.addToast?.('Erro ao marcar como lidos.', 'error');
    }
  }, [toast, recarregarLembretes]);

  const handleCriarLembrete = useCallback(() => {
    setAlertsOpen(false);
    setModalLembreteOpen(true);
  }, []);

  return (
    <GuardiaoAceiteTermos>
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
          <ImpersonacaoBanner />

          <AppTopbar
            nomeUsuario={nomeUsuario}
            alertsOpen={alertsOpen}
            alertas={alertas}
            alertasLoading={alertasLoading}
            contadorNaoVistos={contadorNaoVistos}
            sseConnected={sseConnected}
            alertsRef={alertsRef}
            onOpenMenu={handleOpenMobileMenu}
            onToggleAlerts={handleToggleAlerts}
            onCloseAlerts={handleCloseAlerts}
            onLogout={handleLogout}
            onOpenAlert={handleOpenAlertDetails}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismiss}
            onMarkAllAsRead={handleMarkAllAsRead}
            lembretes={lembretes}
            lembretesBadge={lembretesBadge}
            lembretesLoading={lembretesLoading}
            onOpenLembrete={handleOpenLembrete}
            onConcluirLembrete={handleConcluirLembrete}
            onMarcarTodosLembretesLidos={handleMarcarTodosLembretesLidos}
            onCriarLembrete={handleCriarLembrete}
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

      {/* Modal de criacao de lembrete acessivel a partir do sino unificado */}
      <ModalLembrete
        open={modalLembreteOpen}
        onClose={() => setModalLembreteOpen(false)}
        onSaved={() => {
          setModalLembreteOpen(false);
          recarregarLembretes?.();
        }}
      />
    </GuardiaoAceiteTermos>
  );
}

export default AppLayout;
