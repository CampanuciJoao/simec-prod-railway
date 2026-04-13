// Ficheiro: src/components/ProtectedRoute.jsx
// Versão: Multi-tenant ready

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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Blindagem extra para SaaS:
  // se existir usuário autenticado, mas sem tenantId,
  // tratamos como sessão inválida.
  if (usuario && !usuario.tenantId) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;