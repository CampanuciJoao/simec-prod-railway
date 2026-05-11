import { Navigate, Route } from 'react-router-dom';

import AdminRoute from '@/components/routes/AdminRoute';
import {
  EmailsNotificacaoPage,
  TelegramNotificacaoPage,
  SalvarEquipamentoPage,
  SalvarUnidadePage,
  UnidadesPage,
} from '@/routes/lazyPages';

function CadastrosRouteElements() {
  return (
    <>
      {/* Hub de Cadastros foi movido para /gerenciamento/cadastros.
          Mantemos o redirect para preservar bookmarks e atalhos antigos. */}
      <Route path="cadastros" element={<Navigate to="/gerenciamento/cadastros" replace />} />
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
      <Route
        path="cadastros/telegram"
        element={
          <AdminRoute>
            <TelegramNotificacaoPage />
          </AdminRoute>
        }
      />
    </>
  );
}

export default CadastrosRouteElements;
