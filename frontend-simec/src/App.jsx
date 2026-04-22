import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/routes/ProtectedRoute';
import AdminRoute from '@/components/routes/AdminRoute';
import SuperAdminRoute from '@/components/routes/SuperAdminRoute';
import AppLayout from '@/components/layouts/AppLayout';
import BIPage from '@/pages/bi/BIPage';

const PageLoader = () => (
  <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-100">
    <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#3b82f6" />
  </div>
);

const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = React.lazy(() =>
  import('@/pages/auth/ForgotPasswordPage')
);
const ResetPasswordPage = React.lazy(() =>
  import('@/pages/auth/ResetPasswordPage')
);
const DashboardPage = React.lazy(() =>
  import('@/pages/dashboard/DashboardPage')
);
const CadastrosGeraisPage = React.lazy(() =>
  import('@/pages/cadastros/CadastrosGeraisPage')
);
const EquipamentosPage = React.lazy(() =>
  import('@/pages/equipamentos/EquipamentosPage')
);
const DetalhesEquipamentoPage = React.lazy(() =>
  import('@/pages/equipamentos/DetalhesEquipamentoPage')
);
const FichaTecnicaPage = React.lazy(() =>
  import('@/pages/equipamentos/FichaTecnicaPage')
);
const SalvarEquipamentoPage = React.lazy(() =>
  import('@/pages/equipamentos/SalvarEquipamentoPage')
);
const PacsPage = React.lazy(() => import('@/pages/cadastros/PacsPage'));
const ManutencoesPage = React.lazy(() =>
  import('@/pages/manutencoes/ManutencoesPage')
);
const DetalhesManutencaoPage = React.lazy(() =>
  import('@/pages/manutencoes/DetalhesManutencaoPage')
);
const SalvarManutencaoPage = React.lazy(() =>
  import('@/pages/manutencoes/SalvarManutencaoPage')
);
const ContratosPage = React.lazy(() =>
  import('@/pages/contratos/ContratosPage')
);
const SalvarContratoPage = React.lazy(() =>
  import('@/pages/contratos/SalvarContratoPage')
);
const DetalhesContratoPage = React.lazy(() =>
  import('@/pages/contratos/DetalhesContratoPage')
);
const SegurosPage = React.lazy(() => import('@/pages/seguros/SegurosPage'));
const SalvarSeguroPage = React.lazy(() =>
  import('@/pages/seguros/SalvarSeguroPage')
);
const DetalhesSeguroPage = React.lazy(() =>
  import('@/pages/seguros/DetalhesSeguroPage')
);
const UnidadesPage = React.lazy(() => import('@/pages/unidades/UnidadesPage'));
const SalvarUnidadePage = React.lazy(() =>
  import('@/pages/unidades/SalvarUnidadePage')
);
const RelatoriosPage = React.lazy(() =>
  import('@/pages/relatorios/RelatoriosPage')
);
const AlertasPage = React.lazy(() =>
  import('@/pages/notificacoes/AlertasPage')
);
const EmailsNotificacaoPage = React.lazy(() =>
  import('@/pages/notificacoes/EmailsNotificacaoPage')
);
const HelpCenterPage = React.lazy(() => import('@/pages/help/HelpCenterPage'));
const GerenciamentoPage = React.lazy(() =>
  import('@/pages/gerenciamento/GerenciamentoPage')
);
const GerenciarUsuariosPage = React.lazy(() =>
  import('@/pages/gerenciamento/GerenciarUsuariosPage')
);
const TenantSettingsPage = React.lazy(() =>
  import('@/pages/gerenciamento/TenantSettingsPage')
);
const LogAuditoriaPage = React.lazy(() =>
  import('@/pages/auditoria/LogAuditoriaPage')
);
const AuditoriaDetalhadaPage = React.lazy(() =>
  import('@/pages/auditoria/AuditoriaDetalhadaPage')
);
const SuperAdminPage = React.lazy(() =>
  import('@/pages/superadmin/SuperAdminPage')
);
const SuperAdminTenantsPage = React.lazy(() =>
  import('@/pages/superadmin/SuperAdminTenantsPage')
);
const SuperAdminHelpPage = React.lazy(() =>
  import('@/pages/superadmin/SuperAdminHelpPage')
);

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/recuperar-senha"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />
            }
          />
          <Route
            path="/redefinir-senha/:token"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <ResetPasswordPage />
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="bi" element={<BIPage />} />
            <Route path="ajuda" element={<HelpCenterPage />} />

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
              element={<SalvarEquipamentoPage />}
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
              path="cadastros/pacs"
              element={
                <AdminRoute>
                  <PacsPage />
                </AdminRoute>
              }
            />

            <Route path="equipamentos" element={<EquipamentosPage />} />
            <Route
              path="equipamentos/detalhes/:equipamentoId"
              element={<DetalhesEquipamentoPage />}
            />
            <Route
              path="equipamentos/ficha-tecnica/:id"
              element={<FichaTecnicaPage />}
            />

            <Route path="manutencoes" element={<ManutencoesPage />} />
            <Route
              path="manutencoes/detalhes/:manutencaoId"
              element={<DetalhesManutencaoPage />}
            />
            <Route path="manutencoes/agendar" element={<SalvarManutencaoPage />} />
            <Route
              path="manutencoes/editar/:manutencaoId"
              element={<SalvarManutencaoPage />}
            />

            <Route path="contratos" element={<ContratosPage />} />
            <Route path="contratos/adicionar" element={<SalvarContratoPage />} />
            <Route path="contratos/editar/:id" element={<SalvarContratoPage />} />
            <Route
              path="contratos/detalhes/:id"
              element={<DetalhesContratoPage />}
            />

            <Route path="seguros" element={<SegurosPage />} />
            <Route path="seguros/adicionar" element={<SalvarSeguroPage />} />
            <Route path="seguros/editar/:id" element={<SalvarSeguroPage />} />
            <Route path="seguros/detalhes/:id" element={<DetalhesSeguroPage />} />

            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="alertas" element={<AlertasPage />} />
            <Route
              path="auditoria/manutencao/:id"
              element={<AuditoriaDetalhadaPage />}
            />

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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <div className="app-creator-signature">Desenvolvido por Joao Campanuci</div>
    </>
  );
}

export default App;
