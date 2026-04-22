import { Navigate, Route } from 'react-router-dom';

import {
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
    </>
  );
}

export default PublicRouteElements;
