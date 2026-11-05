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
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    console.log('[SUNGROW_INTERCEPTOR] detectou code na URL', {
      codeLen: code.length,
      redirectUri,
      href: window.location.href,
      temOpener: Boolean(window.opener),
    });
    (async () => {
      let respostaStatus = 'nao-chamado';
      let respostaBody = '';
      try {
        // IMPORTANTE: fetch tem que ir pro backend direto (simec-backend-
        // production.up.railway.app), nao pro simec.cerdil.com.br. O
        // dominio do frontend serve so arquivos estaticos — qualquer
        // /api/* la cai no fallback do SPA (index.html) e nunca chega
        // no backend. Por isso usamos VITE_API_URL (ja aponta pro
        // backend sem o sufixo /api).
        // .trim() protege contra \n/\r/espacos que podem vir no env var
        // do Railway (acontece quando o valor foi colado com quebra de
        // linha). Sem trim o regex nao matcha o /api final e a gente
        // acaba com /api\n/api/ na URL, que o browser normaliza pra
        // /api/api/ — 401 garantido.
        const apiBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/api\/?$/, '');
        const qs = new URLSearchParams({ code, redirectUri }).toString();
        const url = `${apiBase}/api/solar/sungrow/callback?${qs}`;
        console.log('[SUNGROW_INTERCEPTOR] chamando backend:', url);
        const r = await fetch(url, { method: 'GET' });
        respostaStatus = r.status;
        try { respostaBody = (await r.text()).slice(0, 500); } catch {}
        console.log('[SUNGROW_INTERCEPTOR] resposta backend:', respostaStatus, respostaBody.slice(0, 200));
      } catch (err) {
        respostaStatus = 'fetch-error';
        respostaBody = String(err?.message || err);
        console.error('[SUNGROW_INTERCEPTOR] fetch falhou:', err);
      } finally {
        // Guarda resultado em sessionStorage pra visibilidade — se o
        // popup fechar rapido demais o usuario perder console.log.
        try {
          sessionStorage.setItem('sungrow-last-oauth', JSON.stringify({
            at: new Date().toISOString(),
            status: respostaStatus,
            body: respostaBody.slice(0, 200),
          }));
        } catch {}
        try {
          const limpa = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', limpa || '/');
        } catch {}
        // Pausa 1.5s pra dar tempo de o admin ver os logs no DevTools
        // antes de fechar o popup. Se nao for popup (window.opener null),
        // nao fecha nada — so some o spinner.
        setTimeout(() => {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ sungrowAuth: respostaStatus === 200 ? 'ok' : 'erro' }, '*');
              setTimeout(() => { try { window.close(); } catch {} }, 300);
            }
          } catch {}
          setProcessando(false);
        }, 1500);
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
