import { Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/routes/ProtectedRoute';
import AdminRouteElements from '@/routes/modules/AdminRouteElements';
import CadastrosRouteElements from '@/routes/modules/CadastrosRouteElements';
import CoreRouteElements from '@/routes/modules/CoreRouteElements';
import OperacionalRouteElements from '@/routes/modules/OperacionalRouteElements';
import PublicRouteElements from '@/routes/modules/PublicRouteElements';
import SuperAdminRouteElements from '@/routes/modules/SuperAdminRouteElements';

function AppRoutes({ isAuthenticated }) {
  return (
    <Routes>
      <PublicRouteElements isAuthenticated={isAuthenticated} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <CoreRouteElements />
        <CadastrosRouteElements />
        <OperacionalRouteElements />
        <AdminRouteElements />
        <SuperAdminRouteElements />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
