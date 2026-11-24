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
 * Painel unificado de notificações — Alertas + Lembretes em abas, num único
 * sino no header. Badge soma ambos. Usa os tokens do design system do SIMEC
 * (var(--text-primary), var(--bg-surface), etc.) pra funcionar em dark+light.
 */
function NotificationsPanel({
  open = false,
  onToggle,
  onClose,
  sseConnected = false,

  alertas = [],
  loading = false,
  contadorNaoVistos = 0,
  onOpenAlert,
  onMarkAsRead,
  onDismiss,
  onMarkAllAsRead,

  lembretes = [],
  lembretesBadge = { naoLidos: 0, atrasados: 0, total: 0 },
  lembretesLoading = false,
  onOpenLembrete,
  onConcluirLembrete,
  onMarcarTodosLembretesLidos,
  onCriarLembrete,
}) {
  const tz = useTenantTimezone();
  const [aba, setAba] = useState('alertas');

  const alertasRecentes = Array.isArray(alertas) ? alertas.slice(0, 8) : [];
  const lembretesRecentes = Array.isArray(lembretes) ? lembretes.slice(0, 8) : [];

  const totalBadge = Number(contadorNaoVistos || 0) + Number(lembretesBadge?.total || 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface-subtle)',
          color: 'var(--text-secondary)',
        }}
        title="Notificações e lembretes"
        aria-label="Notificações e lembretes"
      >
        <FontAwesomeIcon icon={faBell} />

        {totalBadge > 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: 'var(--color-danger)', color: '#ffffff' }}
          >
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: 'var(--overlay-bg)' }}
            onClick={onClose}
            aria-label="Fechar notificações"
          />

          <div
            className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl border shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-3 md:w-[440px] md:max-w-[calc(100vw-32px)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-soft)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Notificações
                  </h3>
                  <span
                    title={sseConnected ? 'Tempo real ativo' : 'Tempo real desconectado'}
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: sseConnected ? 'var(--color-success)' : 'var(--border-soft)',
                    }}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {contadorNaoVistos} alerta(s) · {lembretesBadge?.total || 0} lembrete(s)
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Fechar notificações"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Abas */}
            <div
              className="flex"
              style={{
                borderBottom: '1px solid var(--border-soft)',
                backgroundColor: 'var(--bg-surface-subtle)',
              }}
            >
              <TabButton
                active={aba === 'alertas'}
                onClick={() => setAba('alertas')}
                label="Alertas"
                badge={contadorNaoVistos}
                badgeTone="brand"
              />
              <TabButton
                active={aba === 'lembretes'}
                onClick={() => setAba('lembretes')}
                label="Lembretes"
                badge={lembretesBadge?.total || 0}
                badgeTone="warning"
              />
            </div>

            {/* Toolbar da aba ativa */}
            <div
              className="flex items-center justify-end gap-1 px-3 py-1.5"
              style={{
                borderBottom: '1px solid var(--border-soft)',
                backgroundColor: 'var(--bg-surface-subtle)',
              }}
            >
              {aba === 'alertas' ? (
                <>
                  {onMarkAllAsRead && alertasRecentes.length > 0 && (
                    <ToolbarButton
                      onClick={onMarkAllAsRead}
                      disabled={contadorNaoVistos === 0}
                      icon={faCheckDouble}
                      label="Marcar todos"
                      title={
                        contadorNaoVistos === 0
                          ? 'Todos os alertas já estão lidos'
                          : `Marcar todas como lidas (${contadorNaoVistos})`
                      }
                    />
                  )}
                  <Link
                    to="/alertas"
                    onClick={onClose}
                    className="rounded-lg px-2 py-1 text-xs font-semibold transition"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    Ver todos
                  </Link>
                </>
              ) : (
                <>
                  {onCriarLembrete && (
                    <ToolbarButton
                      onClick={onCriarLembrete}
                      icon={faPlus}
                      label="Novo"
                      tone="brand"
                      title="Criar novo lembrete"
                    />
                  )}
                  {onMarcarTodosLembretesLidos && (
                    <ToolbarButton
                      onClick={onMarcarTodosLembretesLidos}
                      disabled={!lembretesBadge?.naoLidos}
                      icon={faCheckDouble}
                      label="Marcar todos"
                      title="Marcar todos lembretes como lidos"
                    />
                  )}
                  <Link
                    to="/lembretes"
                    onClick={onClose}
                    className="rounded-lg px-2 py-1 text-xs font-semibold transition"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    Ver todos
                  </Link>
                </>
              )}
            </div>

            {/* Conteúdo */}
            <div className="max-h-[min(70vh,420px)] overflow-y-auto md:max-h-[420px]">
              {aba === 'alertas'
                ? renderAlertas({ alertasRecentes, loading, tz, onOpenAlert, onMarkAsRead, onDismiss })
                : renderLembretes({ lembretesRecentes, loading: lembretesLoading, onOpenLembrete, onConcluirLembrete, onCriarLembrete })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, disabled, icon, label, tone, title }) {
  const color = tone === 'brand' ? 'var(--brand-primary)' : 'var(--text-muted)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color }}
    >
      <FontAwesomeIcon icon={icon} />
      {label}
    </button>
  );
}

function TabButton({ active, onClick, label, badge, badgeTone = 'brand' }) {
  const badgeBg = badgeTone === 'warning' ? 'var(--color-warning)' : 'var(--brand-primary)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold transition"
      style={{
        borderColor: active ? 'var(--brand-primary)' : 'transparent',
        backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {badge > 0 && (
          <span
            className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
            style={{ backgroundColor: badgeBg, color: '#ffffff' }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
    </button>
  );
}

function renderAlertas({ alertasRecentes, loading, tz, onOpenAlert, onMarkAsRead, onDismiss }) {
  if (loading && alertasRecentes.length === 0) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        Carregando alertas...
      </div>
    );
  }
  if (alertasRecentes.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Nenhuma notificação pendente.
      </div>
    );
  }
  return alertasRecentes.map((alerta) => (
    <div
      key={alerta.id}
      className="px-4 py-3 transition"
      style={{
        borderBottom: '1px solid var(--border-soft)',
        backgroundColor: alerta.status === 'NaoVisto'
          ? 'var(--brand-primary-surface)'
          : 'var(--bg-surface)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => onOpenAlert(alerta)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {alerta.titulo}
            </p>
            {alerta.status === 'NaoVisto' && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              />
            )}
          </div>
          {alerta.subtitulo ? (
            <p
              className="mt-1 line-clamp-2 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              {alerta.subtitulo}
            </p>
          ) : null}
          <div
            className="mt-2 flex flex-wrap items-center gap-2 text-[11px] sm:gap-3"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} />
              {formatarDataHora(alerta.data, { timeZone: tz })}
            </span>
            {alerta.tipo && (
              <span
                className="rounded-full px-2 py-0.5 font-semibold"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {alerta.tipo}
              </span>
            )}
            {alerta.prioridade && (
              <span
                className="rounded-full px-2 py-0.5 font-semibold"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
              style={{ color: 'var(--color-success)' }}
              title="Marcar como visto"
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAlert(alerta)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
              style={{ color: 'var(--brand-primary)' }}
              title="Abrir alerta"
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(alerta.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
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

function rotuloRelativoBr(iso) {
  const alvo = new Date(iso);
  if (Number.isNaN(alvo.getTime())) return '';
  const diff = alvo.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const hora = Math.round(min / 60);
  const dia = Math.round(hora / 24);
  const texto = min < 1 ? 'agora' : min < 60 ? `${min}min` : hora < 24 ? `${hora}h` : `${dia} ${dia === 1 ? 'dia' : 'dias'}`;
  return diff < 0 ? `atrasado ${texto}` : `em ${texto}`;
}

function renderLembretes({ lembretesRecentes, loading, onOpenLembrete, onConcluirLembrete, onCriarLembrete }) {
  if (loading && lembretesRecentes.length === 0) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        Carregando lembretes...
      </div>
    );
  }
  if (lembretesRecentes.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        <FontAwesomeIcon icon={faBell} className="mb-2 text-2xl opacity-40" />
        <p>Nenhum lembrete pendente.</p>
        {onCriarLembrete && (
          <button
            type="button"
            onClick={onCriarLembrete}
            className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
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

    let bgColor = 'var(--bg-surface)';
    if (naoLido)   bgColor = 'var(--color-warning-surface)';
    else if (atrasado) bgColor = 'var(--color-danger-surface)';

    return (
      <div
        key={l.id}
        className="px-4 py-3"
        style={{
          borderBottom: '1px solid var(--border-soft)',
          backgroundColor: bgColor,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => onOpenLembrete?.(l)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: 'var(--color-warning-soft)',
                  color: 'var(--color-warning)',
                }}
              >
                Lembrete
              </span>
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {l.titulo}
              </p>
              {naoLido && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: 'var(--color-warning)' }}
                />
              )}
              {atrasado && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: 'var(--color-danger)' }}
                />
              )}
            </div>
            {l.descricao ? (
              <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {l.descricao}
              </p>
            ) : null}
            <div
              className="mt-2 flex flex-wrap items-center gap-2 text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} />
                {formatarDataHoraBr(l.lembrarEm)}
                <span
                  className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: atrasado ? 'var(--color-danger-soft)' : 'var(--bg-surface-subtle)',
                    color: atrasado ? 'var(--color-danger)' : 'var(--text-secondary)',
                  }}
                >
                  {rotuloRelativoBr(l.lembrarEm)}
                </span>
              </span>
              {l.entidadeTipo && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    backgroundColor: 'var(--brand-primary-soft)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <FontAwesomeIcon icon={faLink} />
                  {LABELS_ENTIDADE_LEMBRETE[l.entidadeTipo] || 'Vínculo'}
                </span>
              )}
              {l.criadoPor?.id !== l.destinatario?.id && l.criadoPor?.nome && (
                <span
                  className="rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  de {l.criadoPor.nome.split(' ')[0]}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onConcluirLembrete?.(l)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
            style={{ color: 'var(--color-success)' }}
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
