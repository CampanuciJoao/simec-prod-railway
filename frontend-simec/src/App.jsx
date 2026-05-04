import React, { Suspense, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import PageLoader from '@/routes/PageLoader';

function App() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    console.log(
      '%c SIMEC %c Desenvolvido por Joao Campanuci ',
      'background:#0f172a;color:#38bdf8;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px;font-size:12px;',
      'background:#1e293b;color:#94a3b8;padding:4px 8px;border-radius:0 4px 4px 0;font-size:12px;'
    );
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes isAuthenticated={isAuthenticated} />
    </Suspense>
  );
}

export default App;
