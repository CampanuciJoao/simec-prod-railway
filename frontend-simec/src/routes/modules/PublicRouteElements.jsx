import { Navigate, Route } from 'react-router-dom';

import {
  DocumentoLegalPage,
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
} from '@/routes/lazyPages';

function PublicRouteElements({ isAuthenticated }) {
  return (
    <>
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
      {/* Paginas legais publicas (LGPD) — acessiveis sem login. */}
      <Route
        path="/privacidade"
        element={<DocumentoLegalPage documento="politica_privacidade" />}
      />
      <Route
        path="/termos"
        element={<DocumentoLegalPage documento="termos_uso" />}
      />
    </>
  );
}

export default PublicRouteElements;
