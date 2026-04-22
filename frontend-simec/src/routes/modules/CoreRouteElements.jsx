import { Navigate, Route } from 'react-router-dom';

import { BIPage, DashboardPage, HelpCenterPage } from '@/routes/lazyPages';

function CoreRouteElements() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="bi" element={<BIPage />} />
      <Route path="ajuda" element={<HelpCenterPage />} />
    </>
  );
}

export default CoreRouteElements;
