import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import ProtectedRoute from '@/components/routes/ProtectedRoute';
import AdminRoute from '@/components/routes/AdminRoute';
import AppLayout from '@/components/layouts/AppLayout';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

// Importação fixa do BI
import BIPage from '@/pages/bi/BIPage';

const PageLoader = () => (
  <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-100">
    <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#3b82f6" />
  </div>
);

// Pages com lazy loading
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));

const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));

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

const GerenciamentoPage = React.lazy(() =>
  import('@/pages/gerenciamento/GerenciamentoPage')
);
const GerenciarUsuariosPage = React.lazy(() =>
  import('@/pages/gerenciamento/GerenciarUsuariosPage')
);

const LogAuditoriaPage = React.lazy(() =>
  import('@/pages/auditoria/LogAuditoriaPage')
);
const AuditoriaDetalhadaPage = React.lazy(() =>
  import('@/pages/auditoria/AuditoriaDetalhadaPage')
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

            {/* HUB DE CADASTROS */}
            <Route path="cadastros" element={<CadastrosGeraisPage />} />

            {/* SUBROTAS DE CADASTROS */}
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

            {/* EQUIPAMENTOS */}
            <Route path="equipamentos" element={<EquipamentosPage />} />
            <Route
              path="equipamentos/detalhes/:equipamentoId"
              element={<DetalhesEquipamentoPage />}
            />
            <Route
              path="equipamentos/ficha-tecnica/:id"
              element={<FichaTecnicaPage />}
            />

            {/* MANUTENÇÕES */}
            <Route path="manutencoes" element={<ManutencoesPage />} />
            <Route
              path="manutencoes/detalhes/:manutencaoId"
              element={<DetalhesManutencaoPage />}
            />
            <Route
              path="manutencoes/agendar"
              element={<SalvarManutencaoPage />}
            />
            <Route
              path="manutencoes/editar/:manutencaoId"
              element={<SalvarManutencaoPage />}
            />

            {/* CONTRATOS */}
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="contratos/adicionar" element={<SalvarContratoPage />} />
            <Route path="contratos/editar/:id" element={<SalvarContratoPage />} />
            <Route
              path="contratos/detalhes/:id"
              element={<DetalhesContratoPage />}
            />

            {/* SEGUROS */}
            <Route path="seguros" element={<SegurosPage />} />
            <Route path="seguros/adicionar" element={<SalvarSeguroPage />} />
            <Route path="seguros/editar/:id" element={<SalvarSeguroPage />} />
            <Route path="seguros/detalhes/:id" element={<DetalhesSeguroPage />} />

            {/* RELATÓRIOS / ALERTAS */}
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="alertas" element={<AlertasPage />} />

            {/* AUDITORIA */}
            <Route
              path="auditoria/manutencao/:id"
              element={<AuditoriaDetalhadaPage />}
            />

            {/* GERENCIAMENTO */}
            <Route path="gerenciamento" element={<GerenciamentoPage />}>
              <Route index element={<Navigate to="usuarios" replace />} />
              <Route path="usuarios" element={<GerenciarUsuariosPage />} />
              <Route path="auditoria" element={<LogAuditoriaPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <div className="app-creator-signature">Desenvolvido por João Campanuci</div>
    </>
  );
}

export default App;