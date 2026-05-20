import { Navigate, Route } from 'react-router-dom';

import SuperAdminRoute from '@/components/routes/SuperAdminRoute';
import {
  SuperAdminHelpPage,
  SuperAdminPage,
  SuperAdminSaudePage,
  SuperAdminTenantsPage,
} from '@/routes/lazyPages';

function SuperAdminRouteElements() {
  return (
    <Route
      path="superadmin"
      element={
        <SuperAdminRoute>
          <SuperAdminPage />
        </SuperAdminRoute>
      }
    >
      <Route index element={<Navigate to="tenants" replace />} />
      <Route path="tenants" element={<SuperAdminTenantsPage />} />
      <Route path="ajuda" element={<SuperAdminHelpPage />} />
      <Route path="saude" element={<SuperAdminSaudePage />} />
    </Route>
  );
}

export default SuperAdminRouteElements;
