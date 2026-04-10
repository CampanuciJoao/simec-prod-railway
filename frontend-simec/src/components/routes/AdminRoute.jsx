// Ficheiro: src/components/AdminRoute.jsx
// VERSÃO FINAL CORRIGIDA

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Um componente "porteiro" que só permite o acesso a crianças
 * se o usuário estiver autenticado E tiver a função 'admin'.
 * Caso contrário, redireciona para o dashboard.
 */
const AdminRoute = ({ children }) => {
    // ==========================================================================
    // >> CORREÇÃO PRINCIPAL APLICADA AQUI <<
    // Desestruturamos 'user' em vez de 'usuario' para corresponder ao AuthContext.
    // ==========================================================================
    const { user } = useAuth();

    // Se o usuário não for um admin, redireciona para o dashboard.
    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    // Se for admin, renderiza a página solicitada.
    return children;
};

export default AdminRoute;