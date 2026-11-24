import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faBellSlash,
  faCheck,
  faCheckDouble,
  faClock,
  faEye,
  faLink,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { formatarDataHora } from '@/utils/timeUtils';
import { useTenantTimezone } from '@/hooks/useTenantTimezone';

const LABELS_ENTIDADE_LEMBRETE = {
  OS_CORRETIVA: 'OS',
  EQUIPAMENTO: 'Equipamento',
  UNIDADE: 'Unidade',
  SEGURO: 'Seguro',
  CONTRATO: 'Contrato',
};

/**
 * Painel unificado de notificações — exibe Alertas do sistema e Lembretes
 * pessoais lado a lado, dentro de um único sino. Abas no topo trocam entre
 * os dois conjuntos; o badge do sino soma ambos pra manter apenas 1 ponto
 * de atenção visual no header.
 */
function NotificationsPanel({
  // Visual / controle externo
  open = false,
  onToggle,
  onClose,
  sseConnected = false,

  // Alertas
  alertas = [],
  loading = false,
  contadorNaoVistos = 0,
  onOpenAlert,
  onMarkAsRead,
  onDismiss,
  onMarkAllAsRead,

  // Lembretes
  lembretes = [],
  lembretesBadge = { naoLidos: 0, atrasados: 0, total: 0 },
  lembretesLoading = false,
  onOpenLembrete,
  onConcluirLembrete,
  onMarcarTodosLembretesLidos,
  onCriarLembrete,
}) {
  const tz = useTenantTimezone();
  const [aba, setAba] = useState('alertas'); // 'alertas' | 'lembretes'

  const alertasRecentes = Array.isArray(alertas) ? alertas.slice(0, 8) : [];
  const lembretesRecentes = Array.isArray(lembretes) ? lembretes.slice(0, 8) : [];

  const totalBadge = Number(contadorNaoVistos || 0) + Number(lembretesBadge?.total || 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
        title="Notificações e lembretes"
        aria-label="Notificações e lembretes"
      >
        <FontAwesomeIcon icon={faBell} />

        {totalBadge > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {totalBadge > 9 ? '9+' : totalBadge}
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

          <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-3 md:w-[440px] md:max-w-[calc(100vw-32px)]">
            {/* Header com título e botão de fechar */}
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
                  {contadorNaoVistos} alerta(s) · {lembretesBadge?.total || 0} lembrete(s)
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar notificações"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <TabButton
                active={aba === 'alertas'}
                onClick={() => setAba('alertas')}
                label="Alertas"
                badge={contadorNaoVistos}
                badgeColor="bg-blue-500"
              />
              <TabButton
                active={aba === 'lembretes'}
                onClick={() => setAba('lembretes')}
                label="Lembretes"
                badge={lembretesBadge?.total || 0}
                badgeColor="bg-amber-500"
              />
            </div>

            {/* Toolbar da aba ativa */}
            <div className="flex items-center justify-end gap-1 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
              {aba === 'alertas' ? (
                <>
                  {onMarkAllAsRead && alertasRecentes.length > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      disabled={contadorNaoVistos === 0}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      title={
                        contadorNaoVistos === 0
                          ? 'Todos os alertas já estão lidos'
                          : `Marcar todas como lidas (${contadorNaoVistos})`
                      }
                    >
                      <FontAwesomeIcon icon={faCheckDouble} />
                      Marcar todos
                    </button>
                  )}
                  <Link
                    to="/alertas"
                    onClick={onClose}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    Ver todos
                  </Link>
                </>
              ) : (
                <>
                  {onCriarLembrete && (
                    <button
                      type="button"
                      onClick={onCriarLembrete}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                      title="Criar novo lembrete"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Novo
                    </button>
                  )}
                  {onMarcarTodosLembretesLidos && (
                    <button
                      type="button"
                      onClick={onMarcarTodosLembretesLidos}
                      disabled={!lembretesBadge?.naoLidos}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      title="Marcar todos lembretes como lidos"
                    >
                      <FontAwesomeIcon icon={faCheckDouble} />
                      Marcar todos
                    </button>
                  )}
                  <Link
                    to="/lembretes"
                    onClick={onClose}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    Ver todos
                  </Link>
                </>
              )}
            </div>

            {/* Conteúdo da aba */}
            <div className="max-h-[min(70vh,420px)] overflow-y-auto md:max-h-[420px]">
              {aba === 'alertas'
                ? renderAlertas({
                    alertasRecentes,
                    loading,
                    tz,
                    onOpenAlert,
                    onMarkAsRead,
                    onDismiss,
                  })
                : renderLembretes({
                    lembretesRecentes,
                    loading: lembretesLoading,
                    onOpenLembrete,
                    onConcluirLembrete,
                    onCriarLembrete,
                  })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, badge, badgeColor = 'bg-blue-500' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold transition',
        active
          ? 'border-blue-600 bg-white text-slate-900'
          : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {badge > 0 && (
          <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full ${badgeColor} px-1.5 text-[10px] font-bold text-white`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
    </button>
  );
}

function renderAlertas({ alertasRecentes, loading, tz, onOpenAlert, onMarkAsRead, onDismiss }) {
  if (loading && alertasRecentes.length === 0) {
    return <div className="px-4 py-6 text-sm text-slate-500">Carregando alertas...</div>;
  }
  if (alertasRecentes.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma notificação pendente.</div>;
  }
  return alertasRecentes.map((alerta) => (
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
            <p className="truncate text-sm font-semibold text-slate-900">{alerta.titulo}</p>
            {alerta.status === 'NaoVisto' && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />}
          </div>
          {alerta.subtitulo ? (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{alerta.subtitulo}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 sm:gap-3">
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} />
              {formatarDataHora(alerta.data, { timeZone: tz })}
            </span>
            {alerta.tipo && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                {alerta.tipo}
              </span>
            )}
            {alerta.prioridade && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                {alerta.prioridade}
              </span>
            )}
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
  ));
}

function formatarDataHoraBr(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderLembretes({ lembretesRecentes, loading, onOpenLembrete, onConcluirLembrete, onCriarLembrete }) {
  if (loading && lembretesRecentes.length === 0) {
    return <div className="px-4 py-6 text-sm text-slate-500">Carregando lembretes...</div>;
  }
  if (lembretesRecentes.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-500">
        <FontAwesomeIcon icon={faBell} className="mb-2 text-2xl text-slate-300" />
        <p>Nenhum lembrete pendente.</p>
        {onCriarLembrete && (
          <button
            type="button"
            onClick={onCriarLembrete}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} /> Criar lembrete
          </button>
        )}
      </div>
    );
  }
  return lembretesRecentes.map((l) => {
    const atrasado = new Date(l.lembrarEm) < new Date() && l.status === 'PENDENTE';
    const naoLido = l.status === 'ENVIADO' && !l.lidoEm;
    return (
      <div
        key={l.id}
        className={[
          'border-b border-slate-100 px-4 py-3 last:border-b-0',
          naoLido ? 'bg-amber-50/50' : atrasado ? 'bg-red-50/40' : 'bg-white',
        ].join(' ')}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => onOpenLembrete?.(l)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Lembrete
              </span>
              <p className="truncate text-sm font-semibold text-slate-900">{l.titulo}</p>
              {naoLido && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />}
              {atrasado && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />}
            </div>
            {l.descricao ? (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{l.descricao}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} />
                {formatarDataHoraBr(l.lembrarEm)}
              </span>
              {l.entidadeTipo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                  <FontAwesomeIcon icon={faLink} />
                  {LABELS_ENTIDADE_LEMBRETE[l.entidadeTipo] || 'Vínculo'}
                </span>
              )}
              {l.criadoPor?.id !== l.destinatario?.id && l.criadoPor?.nome && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                  de {l.criadoPor.nome.split(' ')[0]}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onConcluirLembrete?.(l)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-green-600 transition hover:bg-green-50"
            title="Concluir lembrete"
          >
            <FontAwesomeIcon icon={faCheck} />
          </button>
        </div>
      </div>
    );
  });
}

NotificationsPanel.propTypes = {
  open: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  sseConnected: PropTypes.bool,

  alertas: PropTypes.array,
  loading: PropTypes.bool,
  contadorNaoVistos: PropTypes.number,
  onOpenAlert: PropTypes.func.isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  onMarkAllAsRead: PropTypes.func,

  lembretes: PropTypes.array,
  lembretesBadge: PropTypes.object,
  lembretesLoading: PropTypes.bool,
  onOpenLembrete: PropTypes.func,
  onConcluirLembrete: PropTypes.func,
  onMarcarTodosLembretesLidos: PropTypes.func,
  onCriarLembrete: PropTypes.func,
};

export default NotificationsPanel;
