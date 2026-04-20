import { useMemo, useState, useCallback } from 'react';

import { useAlertas } from '@/contexts/AlertasContext';

export function useAppLayoutAlerts({ navigate }) {
  const {
    alertas = [],
    naoVistos = 0,
    loading: alertasLoading,
    updateStatus,
    dismissAlerta,
  } = useAlertas();

  const [alertsOpen, setAlertsOpen] = useState(false);

  const contadorNaoVistos = useMemo(() => {
    return Number(naoVistos || 0);
  }, [naoVistos]);

  const handleToggleAlerts = useCallback(() => {
    setAlertsOpen((prev) => !prev);
  }, []);

  const handleCloseAlerts = useCallback(() => {
    setAlertsOpen(false);
  }, []);

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

  return {
    alertas,
    alertasLoading,
    alertsOpen,
    contadorNaoVistos,
    setAlertsOpen,
    handleToggleAlerts,
    handleCloseAlerts,
    handleOpenAlertDetails,
    handleMarkAsRead,
    handleDismiss,
  };
}

export default useAppLayoutAlerts;
