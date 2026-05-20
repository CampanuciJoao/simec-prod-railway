import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '@/contexts/AuthContext';

// Banner persistente exibido quando o superadmin está atuando como outro
// tenant. Inspirado no banner amarelo do ServiceNow/Nuvolo. Visível em
// todas as rotas via renderização no AppLayout.
function ImpersonacaoBanner() {
  const { impersonacao, encerrarImpersonacao } = useAuth();

  if (!impersonacao?.tenant) return null;

  const inicio = impersonacao.iniciadaEm
    ? new Date(impersonacao.iniciadaEm).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 w-full"
      style={{
        backgroundColor: 'rgba(234, 179, 8, 0.16)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
        color: 'rgb(120, 73, 5)',
      }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-2 text-sm sm:px-6">
        <FontAwesomeIcon icon={faTriangleExclamation} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="font-semibold">Você está atuando como </span>
          <span className="font-semibold">
            {impersonacao.tenant.nome || impersonacao.tenant.slug}
          </span>
          {impersonacao.motivo ? (
            <>
              {' · Motivo: '}
              <span className="italic">{impersonacao.motivo}</span>
            </>
          ) : null}
          {inicio ? (
            <>
              {' · Iniciado às '}
              <span className="font-mono tabular-nums">{inicio}</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={encerrarImpersonacao}
          className="inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition hover:bg-yellow-100"
          style={{ borderColor: 'rgba(234, 179, 8, 0.6)' }}
        >
          <FontAwesomeIcon icon={faXmark} />
          Sair desta sessão
        </button>
      </div>
    </div>
  );
}

export default ImpersonacaoBanner;
