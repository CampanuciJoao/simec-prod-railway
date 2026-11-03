import { Navigate, Route } from 'react-router-dom';

import { BIPage, DashboardPage, HelpCenterPage, MonitoramentoPage } from '@/routes/lazyPages';

function CoreRouteElements() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="bi" element={<BIPage />} />
      <Route path="monitoramento" element={<MonitoramentoPage />} />
      <Route path="ajuda" element={<HelpCenterPage />} />
    </>
  );
}

export default CoreRouteElements;
