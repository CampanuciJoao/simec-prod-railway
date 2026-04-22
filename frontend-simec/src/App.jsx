import React, { Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import PageLoader from '@/routes/PageLoader';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <AppRoutes isAuthenticated={isAuthenticated} />
      </Suspense>

      <div className="app-creator-signature">Desenvolvido por Joao Campanuci</div>
    </>
  );
}

export default App;
