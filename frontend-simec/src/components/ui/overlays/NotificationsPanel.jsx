import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faBellSlash,
  faCheck,
  faClock,
  faEye,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

function formatarDataCurta(data) {
  if (!data) return '-';

  try {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function NotificationsPanel({
  open = false,
  alertas = [],
  loading = false,
  contadorNaoVistos = 0,
  sseConnected = false,
  onToggle,
  onClose,
  onOpenAlert,
  onMarkAsRead,
  onDismiss,
}) {
  const alertasRecentes = Array.isArray(alertas) ? alertas.slice(0, 8) : [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
        title="Notificações"
        aria-label="Notificações"
      >
        <FontAwesomeIcon icon={faBell} />

        {contadorNaoVistos > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {contadorNaoVistos > 9 ? '9+' : contadorNaoVistos}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
            onClick={onClose}
            aria-label="Fechar notificações"
          />

          <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-3 md:w-[420px] md:max-w-[calc(100vw-32px)]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Notificações</h3>
                  <span
                    title={sseConnected ? 'Tempo real ativo' : 'Tempo real desconectado'}
                    className={[
                      'h-2 w-2 shrink-0 rounded-full',
                      sseConnected ? 'bg-green-500' : 'bg-slate-300',
                    ].join(' ')}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {contadorNaoVistos} não visto(s)
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/alertas"
                  onClick={onClose}
                  className="text-xs font-semibold text-blue-600 transition hover:underline"
                >
                  Ver todos
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Fechar notificações"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>

            <div className="max-h-[min(70vh,420px)] overflow-y-auto md:max-h-[420px]">
              {loading ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Carregando alertas...
                </div>
              ) : alertasRecentes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Nenhuma notificação disponível.
                </div>
              ) : (
                alertasRecentes.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={[
                      'border-b border-slate-100 px-4 py-3 transition last:border-b-0',
                      alerta.status === 'NaoVisto' ? 'bg-blue-50/40' : 'bg-white',
                    ].join(' ')}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <button
                        type="button"
                        onClick={() => onOpenAlert(alerta)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {alerta.titulo}
                          </p>

                          {alerta.status === 'NaoVisto' && (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                          )}
                        </div>

                        {alerta.subtitulo ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {alerta.subtitulo}
                          </p>
                        ) : null}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 sm:gap-3">
                          <span className="inline-flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} />
                            {formatarDataCurta(alerta.data)}
                          </span>

                          {alerta.tipo ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                              {alerta.tipo}
                            </span>
                          ) : null}

                          {alerta.prioridade ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                              {alerta.prioridade}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center justify-end gap-1 sm:pt-0.5">
                        {alerta.status === 'NaoVisto' ? (
                          <button
                            type="button"
                            onClick={() => onMarkAsRead(alerta.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-green-600 transition hover:bg-green-50"
                            title="Marcar como visto"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenAlert(alerta)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                            title="Abrir alerta"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDismiss(alerta.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Dispensar alerta"
                        >
                          <FontAwesomeIcon icon={faBellSlash} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

NotificationsPanel.propTypes = {
  open: PropTypes.bool,
  alertas: PropTypes.array,
  loading: PropTypes.bool,
  contadorNaoVistos: PropTypes.number,
  sseConnected: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenAlert: PropTypes.func.isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default NotificationsPanel;
