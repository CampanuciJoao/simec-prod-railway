import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faEye,
  faEyeSlash,
  faBellSlash,
  faClock,
  faWrench,
  faArrowUpRightFromSquare,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

import { useTenantTime } from '@/hooks/time/useTenantTime';
import { formatarData, formatarHorario } from '@/utils/timeUtils';
import {
  getAlertaVisual,
  getAlertaIcon,
  buildAgendarPreventivaLink,
} from '@/utils/alertas/alertaUtils';

function montarSubtitulo(alerta, timezone, locale) {
  const partes = [];

  if (alerta.subtituloBase) {
    partes.push(alerta.subtituloBase);
  } else if (alerta.subtitulo) {
    partes.push(alerta.subtitulo);
  }

  if (alerta.dataHoraAgendamentoInicio) {
    partes.push(
      formatarHorario(
        alerta.dataHoraAgendamentoInicio,
        alerta.dataHoraAgendamentoFim,
        { timeZone: timezone, locale }
      )
    );
  }

  if (alerta.numeroOS) {
    partes.push(`OS ${alerta.numeroOS}`);
  }

  return partes.filter(Boolean).join(' | ');
}

function extrairExplicacao(alerta) {
  const subtituloCompleto = String(alerta?.subtitulo || '').trim();
  const subtituloBase = String(alerta?.subtituloBase || '').trim();

  if (!subtituloCompleto) return '';
  if (!subtituloBase) return subtituloCompleto;

  if (!subtituloCompleto.startsWith(subtituloBase)) {
    return subtituloCompleto;
  }

  const restante = subtituloCompleto.slice(subtituloBase.length).trim();
  return restante.replace(/^([.|-]|\u2022)\s*/, '').trim();
}

function AlertaItem({ alerta, onUpdateStatus, onDismiss }) {
  const navigate = useNavigate();
  const { timezone, locale } = useTenantTime();
  const [showExplicacao, setShowExplicacao] = useState(false);

  const style = getAlertaVisual(alerta);
  const isRecomendacao = alerta.tipo === 'Recomendação';
  const isAguardandoConfirmacao =
    alerta.tipoEvento === 'MANUT_CONFIRMACAO' ||
    alerta.tipoEvento === 'OS_CORRETIVA_VISITA_CONFIRMACAO';

  const dataFormatada = alerta.data ? formatarData(alerta.data) : '-';
  const subtituloRenderizado = montarSubtitulo(alerta, timezone, locale);
  const explicacao = useMemo(() => extrairExplicacao(alerta), [alerta]);
  const resumoRecomendacao =
    subtituloRenderizado ||
    'O sistema identificou sinais de risco e recomenda avaliação humana do ativo.';

  const handleViewDetails = useCallback(async () => {
    if (alerta.status === 'NaoVisto') {
      await onUpdateStatus(alerta.id, 'Visto');
    }
  }, [alerta.id, alerta.status, onUpdateStatus]);

  const handleOpenLink = useCallback(
    async (event, targetLink = alerta.link || '#') => {
      event.preventDefault();
      await handleViewDetails();
      navigate(targetLink);
    },
    [alerta.link, handleViewDetails, navigate]
  );

  const handleToggleExplicacao = () => {
    handleViewDetails();
    setShowExplicacao((prev) => !prev);
  };

  return (
    <div
      className={[
        'overflow-hidden rounded-xl border-y border-r border-l-[8px] shadow-sm transition-all hover:shadow-md',
        style.border,
        alerta.status === 'Visto' ? 'opacity-70' : '',
      ].join(' ')}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTopColor: 'var(--border-soft)',
        borderRightColor: 'var(--border-soft)',
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              className={[
                'mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                style.iconBg,
                style.iconColor,
              ].join(' ')}
            >
              <FontAwesomeIcon icon={getAlertaIcon(alerta)} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4
                  className="text-base font-bold leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {alerta.titulo}
                </h4>

                {isRecomendacao ? (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                    style={{
                      backgroundColor: 'var(--color-info-surface)',
                      color: 'var(--color-info)',
                    }}
                  >
                    Inteligente
                  </span>
                ) : null}
              </div>

              <div
                className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {subtituloRenderizado ? (
                  <span className="font-medium">{subtituloRenderizado}</span>
                ) : null}

                <span className="flex items-center gap-1 text-xs">
                  <FontAwesomeIcon icon={faClock} />
                  {dataFormatada}
                </span>

                {alerta.tipo ? (
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${style.badge}`}
                  >
                    {alerta.tipo}
                  </span>
                ) : null}

                {alerta.prioridade ? (
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${style.badge}`}
                  >
                    {alerta.prioridade}
                  </span>
                ) : null}

                {isAguardandoConfirmacao ? (
                  <span
                    className="rounded-md px-2 py-1 text-[10px] font-black uppercase"
                    style={{
                      backgroundColor: 'var(--color-warning-surface)',
                      color: 'var(--color-warning)',
                    }}
                  >
                    Ação necessária
                  </span>
                ) : (
                  <span
                    className="rounded-md px-2 py-1 text-[10px] font-black uppercase"
                    style={
                      alerta.status === 'NaoVisto'
                        ? { backgroundColor: 'var(--text-primary)', color: 'var(--text-inverse)' }
                        : { backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-muted)' }
                    }
                  >
                    {alerta.status === 'NaoVisto' ? 'Não visto' : 'Visto'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-2 md:border-l md:pl-5"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            <Link
              to={alerta.link || '#'}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold no-underline transition-all"
              style={{
                borderColor: 'var(--brand-primary-soft)',
                backgroundColor: 'var(--brand-primary-surface)',
                color: 'var(--brand-primary)',
                minHeight: 44,
              }}
              onClick={(event) => handleOpenLink(event)}
            >
              <FontAwesomeIcon icon={faEye} />
              Detalhes
            </Link>

            {isAguardandoConfirmacao ? null : alerta.status === 'Visto' ? (
              <button
                type="button"
                onClick={() => onUpdateStatus(alerta.id, 'NaoVisto')}
                className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-muted)',
                }}
                title="Marcar como não visto"
              >
                <FontAwesomeIcon icon={faEyeSlash} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(alerta.id, 'Visto')}
                  className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--color-success-surface)',
                    color: 'var(--color-success)',
                  }}
                  title="Marcar como visto"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>

                <button
                  type="button"
                  onClick={() => onDismiss(alerta.id)}
                  className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface-soft)',
                    color: 'var(--text-muted)',
                  }}
                  title="Dispensar alerta"
                >
                  <FontAwesomeIcon icon={faBellSlash} />
                </button>
              </>
            )}
          </div>
        </div>

        {isRecomendacao ? (
          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor: 'var(--color-info-soft)',
              backgroundColor: 'var(--color-info-surface)',
            }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-info)' }}>
                  Recomendação proativa
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {resumoRecomendacao}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap w-full md:w-auto">
                {explicacao ? (
                  <button
                    type="button"
                    onClick={handleToggleExplicacao}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition"
                    style={{
                      borderColor: 'var(--color-info-soft)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--color-info)',
                      minHeight: 44,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={showExplicacao ? faChevronUp : faChevronDown}
                    />
                    {showExplicacao ? 'Ocultar explicação' : 'Ver explicação'}
                  </button>
                ) : null}

                <Link
                  to={buildAgendarPreventivaLink(alerta)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold no-underline transition"
                  style={{
                    backgroundColor: 'var(--color-info)',
                    color: '#ffffff',
                    minHeight: 44,
                  }}
                  onClick={(event) =>
                    handleOpenLink(event, buildAgendarPreventivaLink(alerta))
                  }
                >
                  <FontAwesomeIcon icon={faWrench} />
                  Agendar preventiva
                </Link>

                <Link
                  to={alerta.link || '#'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold no-underline transition"
                  style={{
                    borderColor: 'var(--color-info-soft)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--color-info)',
                    minHeight: 44,
                  }}
                  onClick={(event) => handleOpenLink(event)}
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  Ver ficha técnica
                </Link>
              </div>
            </div>

            {showExplicacao && explicacao ? (
              <div
                className="mt-4 rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-info-soft)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <p
                  className="text-xs font-black uppercase tracking-wide"
                  style={{ color: 'var(--color-info)' }}
                >
                  Explicação analítica
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {explicacao}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

AlertaItem.propTypes = {
  alerta: PropTypes.object.isRequired,
  onUpdateStatus: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default AlertaItem;
