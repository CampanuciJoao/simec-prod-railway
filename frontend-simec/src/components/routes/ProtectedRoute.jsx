// src/components/ProtectedRoute.jsx
// CÓDIGO COMPLETO

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Se ainda estiver verificando o token, mostra um loading
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <FontAwesomeIcon icon={faSpinner} spin size="3x" />
            </div>
        );
    }

    // Se não estiver autenticado, redireciona para a página de login
    if (!isAuthenticated) {
        // Guarda a página que o usuário tentou acessar para redirecioná-lo de volta após o login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Se estiver autenticado, renderiza a página solicitada
    return children;
};

export default ProtectedRoute;