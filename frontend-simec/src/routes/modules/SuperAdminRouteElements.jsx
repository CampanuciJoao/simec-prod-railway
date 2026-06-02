import { Navigate, Route } from 'react-router-dom';

import SuperAdminRoute from '@/components/routes/SuperAdminRoute';
import {
  SuperAdminAprendizadoPage,
  SuperAdminAuditoriaPage,
  SuperAdminHelpPage,
  SuperAdminLicaoAuditoriaPage,
  SuperAdminLlmCallLogPage,
  SuperAdminPage,
  SuperAdminSaudePage,
  SuperAdminTenantsPage,
  SuperAdminUsuariosPage,
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
      <Route path="usuarios" element={<SuperAdminUsuariosPage />} />
      <Route path="auditoria" element={<SuperAdminAuditoriaPage />} />
      <Route path="saude" element={<SuperAdminSaudePage />} />
      <Route path="aprendizado" element={<SuperAdminAprendizadoPage />} />
      <Route path="llm-custo" element={<SuperAdminLlmCallLogPage />} />
      <Route path="licao-auditoria" element={<SuperAdminLicaoAuditoriaPage />} />
      <Route path="ajuda" element={<SuperAdminHelpPage />} />
    </Route>
  );
}

export default SuperAdminRouteElements;
