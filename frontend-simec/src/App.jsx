import React, { Suspense } from 'react'; 
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import ToastContainer from '@/components/ToastContainer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import AdminRoute from '@/components/AdminRoute';

// >>> IMPORTAÇÃO FIXA DO BI (PARA NÃO DAR ERRO) <<<
import BIPage from '@/pages/BIPage';

const PageLoader = () => (
  <div className="page-content-wrapper centered-loader" style={{ height: 'calc(100vh - 80px)' }}>
    <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#3b82f6" />
  </div>
);

// --- Componentes de Página (Lazy Loading) ---
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const FichaTecnicaPage = React.lazy(() => import('@/pages/FichaTecnicaPage'));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const RelatoriosPage = React.lazy(() => import('@/pages/RelatoriosPage'));
const AlertasPage = React.lazy(() => import('@/pages/AlertasPage'));
const GerenciamentoPage = React.lazy(() => import('@/pages/GerenciamentoPage'));
const GerenciarUsuariosPage = React.lazy(() => import('@/pages/GerenciarUsuariosPage'));
const LogAuditoriaPage = React.lazy(() => import('@/pages/LogAuditoriaPage'));
const DetalhesEquipamentoPage = React.lazy(() => import('@/pages/DetalhesEquipamentoPage'));
const DetalhesManutencaoPage = React.lazy(() => import('@/pages/DetalhesManutencaoPage'));
const CadastrosGeraisPage = React.lazy(() => import('@/pages/CadastrosGeraisPage'));
const EquipamentosPage = React.lazy(() => import('@/pages/EquipamentosPage'));
const SalvarEquipamentoPage = React.lazy(() => import('@/pages/SalvarEquipamentoPage'));
const UnidadesPage = React.lazy(() => import('@/pages/UnidadesPage'));
const SalvarUnidadePage = React.lazy(() => import('@/pages/SalvarUnidadePage'));
const ContratosPage = React.lazy(() => import('@/pages/ContratosPage'));
const SalvarContratoPage = React.lazy(() => import('@/pages/SalvarContratoPage'));
const ManutencoesPage = React.lazy(() => import('@/pages/ManutencoesPage'));
const SalvarManutencaoPage = React.lazy(() => import('@/pages/SalvarManutencaoPage'));
const SegurosPage = React.lazy(() => import('@/pages/SegurosPage'));
const SalvarSeguroPage = React.lazy(() => import('@/pages/SalvarSeguroPage'));
const EmailsNotificacaoPage = React.lazy(() => import('@/pages/EmailsNotificacaoPage'));
const DetalhesContratoPage = React.lazy(() => import('@/pages/DetalhesContratoPage'));
const DetalhesSeguroPage = React.lazy(() => import('@/pages/DetalhesSeguroPage'));
const AuditoriaDetalhadaPage = React.lazy(() => import('@/pages/AuditoriaDetalhadaPage'));

function App() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" /></div>;

  return (
    <>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="bi" element={<BIPage />} />
            <Route path="equipamentos" element={<EquipamentosPage />} /> 
            <Route path="equipamentos/detalhes/:equipamentoId" element={<DetalhesEquipamentoPage />} />
            <Route path="equipamentos/ficha-tecnica/:id" element={<FichaTecnicaPage />} />
            <Route path="cadastros" element={<CadastrosGeraisPage />}>
                <Route index element={<Navigate to="unidades" replace />} />
                <Route path="unidades" element={<UnidadesPage />} />
                <Route path="unidades/adicionar" element={<SalvarUnidadePage />} />
                <Route path="unidades/editar/:id" element={<SalvarUnidadePage />} />
                <Route path="equipamentos/adicionar" element={<SalvarEquipamentoPage />} />
                <Route path="equipamentos/editar/:equipamentoId" element={<SalvarEquipamentoPage />} />
                <Route path="emails" element={<AdminRoute><EmailsNotificacaoPage /></AdminRoute>} />
            </Route>
            <Route path="manutencoes/detalhes/:manutencaoId" element={<DetalhesManutencaoPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="contratos/adicionar" element={<SalvarContratoPage />} />
            <Route path="contratos/editar/:id" element={<SalvarContratoPage />} />
            <Route path="contratos/detalhes/:id" element={<DetalhesContratoPage />} />
            <Route path="manutencoes" element={<ManutencoesPage />} />
            <Route path="manutencoes/agendar" element={<SalvarManutencaoPage />} />
            <Route path="manutencoes/editar/:manutencaoId" element={<SalvarManutencaoPage />} />
            <Route path="/auditoria/manutencao/:id" element={<AuditoriaDetalhadaPage />} />
            <Route path="seguros" element={<SegurosPage />} />
            <Route path="seguros/adicionar" element={<SalvarSeguroPage />} />
            <Route path="seguros/editar/:id" element={<SalvarSeguroPage />} />
            <Route path="seguros/detalhes/:id" element={<DetalhesSeguroPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="alertas" element={<AlertasPage />} />
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