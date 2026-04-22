import { Navigate, Route } from 'react-router-dom';

import AdminRoute from '@/components/routes/AdminRoute';
import {
  CadastrosGeraisPage,
  EmailsNotificacaoPage,
  SalvarEquipamentoPage,
  SalvarUnidadePage,
  UnidadesPage,
} from '@/routes/lazyPages';

function CadastrosRouteElements() {
  return (
    <>
      <Route path="cadastros" element={<CadastrosGeraisPage />} />
      <Route path="cadastros/unidades" element={<UnidadesPage />} />
      <Route
        path="cadastros/unidades/adicionar"
        element={<SalvarUnidadePage />}
      />
      <Route
        path="cadastros/unidades/editar/:id"
        element={<SalvarUnidadePage />}
      />
      <Route
        path="cadastros/equipamentos/adicionar"
        element={<Navigate to="/equipamentos/adicionar" replace />}
      />
      <Route
        path="cadastros/equipamentos/editar/:equipamentoId"
        element={<SalvarEquipamentoPage />}
      />
      <Route
        path="cadastros/emails"
        element={
          <AdminRoute>
            <EmailsNotificacaoPage />
          </AdminRoute>
        }
      />
    </>
  );
}

export default CadastrosRouteElements;
