import { Navigate, Route } from 'react-router-dom';

import AdminRoute from '@/components/routes/AdminRoute';
import {
  GerenciamentoPage,
  GerenciarUsuariosPage,
  LogAuditoriaPage,
  TenantSettingsPage,
} from '@/routes/lazyPages';

function AdminRouteElements() {
  return (
    <Route
      path="gerenciamento"
      element={
        <AdminRoute>
          <GerenciamentoPage />
        </AdminRoute>
      }
    >
      <Route index element={<Navigate to="usuarios" replace />} />
      <Route path="usuarios" element={<GerenciarUsuariosPage />} />
      <Route path="empresa" element={<TenantSettingsPage />} />
      <Route path="auditoria" element={<LogAuditoriaPage />} />
    </Route>
  );
}

export default AdminRouteElements;
