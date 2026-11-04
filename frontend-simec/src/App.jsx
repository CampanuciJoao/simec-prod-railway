import React, { Suspense, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import PageLoader from '@/routes/PageLoader';

// Intercepta OAuth code que a Sungrow coloca na URL raiz (quando o
// Redirect URL registrado no Developer Portal e o dominio bare
// em vez de /api/solar/sungrow/callback). Repassa pro backend fazer
// a troca do code por token, limpa a URL e fecha o popup.
//
// Rodamos ANTES de montar o resto do App pra garantir que o SPA nao
// redirecione / descarte a query antes de a gente pegar o code.
function useSungrowOAuthInterceptor() {
  const [processando, setProcessando] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('code'));
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    // Snapshot ANTES de limpar a URL. O redirect_uri que a Sungrow
    // usou (= o que esta registrado no portal) e a URL atual sem
    // query string — padrao OAuth2 exige que seja identico no
    // token exchange.
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    (async () => {
      try {
        const qs = new URLSearchParams({ code, redirectUri }).toString();
        await fetch(`/api/solar/sungrow/callback?${qs}`, {
          method: 'GET',
          credentials: 'include',
        });
      } catch (err) {
        console.error('[SUNGROW_INTERCEPTOR] falha:', err);
      } finally {
        // Limpa ?code= da URL pra nao reprocessar em reloads
        try {
          const limpa = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', limpa || '/');
        } catch {}
        // Se estamos em popup, avisa a aba pai e fecha
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ sungrowAuth: 'ok' }, '*');
            setTimeout(() => { try { window.close(); } catch {} }, 300);
          }
        } catch {}
        setProcessando(false);
      }
    })();
  }, []);

  return processando;
}

function App() {
  const { isAuthenticated, loading } = useAuth();
  const processandoSungrow = useSungrowOAuthInterceptor();

  useEffect(() => {
    console.log(
      '%c SIMEC %c Desenvolvido por Joao Campanuci ',
      'background:#0f172a;color:#38bdf8;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px;font-size:12px;',
      'background:#1e293b;color:#94a3b8;padding:4px 8px;border-radius:0 4px 4px 0;font-size:12px;'
    );
  }, []);

  if (processandoSungrow) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
        <p className="mt-4 text-sm text-slate-600">Concluindo autorização Sungrow...</p>
      </div>
    );
  }

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
