import { Navigate, Route } from 'react-router-dom';

import AdminRoute from '@/components/routes/AdminRoute';
import {
  CadastrosGeraisPage,
  ConfiguracaoAlertasPage,
  ControleQualidadeAdminPage,
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
      <Route index element={<Navigate to="cadastros" replace />} />
      <Route path="cadastros"   element={<CadastrosGeraisPage embedded />} />
      <Route path="usuarios"    element={<GerenciarUsuariosPage />} />
      <Route path="empresa"     element={<TenantSettingsPage />} />
      <Route path="auditoria"   element={<LogAuditoriaPage />} />
      <Route path="integracoes" element={<IntegracoesPage />} />
      <Route path="alertas"     element={<ConfiguracaoAlertasPage />} />
      <Route path="controle-qualidade" element={<ControleQualidadeAdminPage />} />
      {/* Redirect da URL antiga para a nova — preserva bookmarks. */}
      <Route path="alertas-ge"  element={<Navigate to="../alertas" replace />} />
    </Route>
  );
}

export default AdminRouteElements;
