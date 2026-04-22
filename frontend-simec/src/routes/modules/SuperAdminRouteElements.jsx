import { Navigate, Route } from 'react-router-dom';

import SuperAdminRoute from '@/components/routes/SuperAdminRoute';
import {
  SuperAdminHelpPage,
  SuperAdminPage,
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
    </Route>
  );
}

export default SuperAdminRouteElements;
