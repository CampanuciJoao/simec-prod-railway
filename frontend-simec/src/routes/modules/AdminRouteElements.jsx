import { Navigate, Route } from 'react-router-dom';

import AdminRoute from '@/components/routes/AdminRoute';
import {
  AlertasGePage,
  GerenciamentoPage,
  GerenciarUsuariosPage,
  IntegracoesPage,
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
      <Route path="usuarios"    element={<GerenciarUsuariosPage />} />
      <Route path="empresa"     element={<TenantSettingsPage />} />
      <Route path="auditoria"   element={<LogAuditoriaPage />} />
      <Route path="integracoes" element={<IntegracoesPage />} />
      <Route path="alertas-ge"  element={<AlertasGePage />} />
    </Route>
  );
}

export default AdminRouteElements;
