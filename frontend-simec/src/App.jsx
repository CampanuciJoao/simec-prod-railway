// Ficheiro: src/App.jsx
// VERSÃO OTIMIZADA - COM LAZY LOADING E SUSPENSE

import React, { Suspense } from 'react'; // Adicionado Suspense
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// --- Componentes de Layout e UI (carregados imediatamente) ---
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import ToastContainer from '@/components/ToastContainer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import AdminRoute from '@/components/AdminRoute';

// --- Placeholder de Carregamento para o Suspense ---
const PageLoader = () => (
  <div className="page-content-wrapper centered-loader" style={{ height: 'calc(100vh - 80px)' }}>
    <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#3b82f6" />
  </div>
);

// --- Componentes de Página (agora com Lazy Loading) ---
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
const AuditoriaDetalhadaPage = React.lazy(() => import('@/pages/AuditoriaDetalhadaPage'));
const EmailsNotificacaoPage = React.lazy(() => import('@/pages/EmailsNotificacaoPage'));
const DetalhesContratoPage = React.lazy(() => import('@/pages/DetalhesContratoPage'));
const DetalhesSeguroPage = React.lazy(() => import('@/pages/DetalhesSeguroPage'));


function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-content-wrapper centered-loader">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      
      {/* O Suspense envolve TODAS as rotas que usam lazy loading.
          Ele mostrará o 'fallback' (nosso PageLoader) enquanto o 
          código da página está sendo baixado. */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
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

            <Route path="contratos">
              <Route index element={<ContratosPage />} />
              <Route path="adicionar" element={<SalvarContratoPage />} />
              <Route path="editar/:id" element={<SalvarContratoPage />} />
              <Route path="detalhes/:id" element={<DetalhesContratoPage />} /> 
            </Route>

            <Route path="manutencoes">
              <Route index element={<ManutencoesPage />} />
              <Route path="agendar" element={<SalvarManutencaoPage />} />
              <Route path="editar/:manutencaoId" element={<SalvarManutencaoPage />} />
            </Route>

            <Route path="/auditoria/manutencao/:id" element={<AuditoriaDetalhadaPage />} />

            <Route path="seguros">
              <Route index element={<SegurosPage />} />
              <Route path="adicionar" element={<SalvarSeguroPage />} />
              <Route path="editar/:id" element={<SalvarSeguroPage />} />
              <Route path="detalhes/:id" element={<DetalhesSeguroPage />} />
            </Route>

            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="alertas" element={<AlertasPage />} />

            <Route path="gerenciamento" element={<GerenciamentoPage />}>
              <Route index element={<Navigate to="usuarios" replace />} />
              <Route path="usuarios" element={<GerenciarUsuariosPage />} />
              <Route path="auditoria" element={<LogAuditoriaPage />} />
            </Route>
          
          </Route>

          <Route path="*" element={
              <div style={{textAlign: 'center', padding: '50px'}}>
                  <h1>404</h1><p>Página não encontrada</p>
                  <Link to="/">Voltar para a página inicial</Link>
              </div>
          } />
        </Routes>
      </Suspense>

      <div className="app-creator-signature">
        Desenvolvido por <a href="https://www.linkedin.com/in/jo%C3%A3o-marcos-campanuci-almeida-3b1384197/" target="_blank" rel="noopener noreferrer">João Campanuci</a>
      </div>
    </>
  );
}

export default App;