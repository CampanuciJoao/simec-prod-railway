import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

const SuperAdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default SuperAdminRoute;
