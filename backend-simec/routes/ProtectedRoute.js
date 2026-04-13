// Ficheiro: src/components/ProtectedRoute.jsx
// Versão: Multi-tenant hardened

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, usuario } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Blindagem extra para SaaS:
  // sessão autenticada sem tenantId é inválida.
  if (!usuario.tenantId) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;