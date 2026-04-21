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

  const dataFormatada = alerta.data ? formatarData(alerta.data) : '-';
  const subtituloRenderizado = montarSubtitulo(alerta, timezone, locale);
  const explicacao = useMemo(() => extrairExplicacao(alerta), [alerta]);
  const resumoRecomendacao =
    subtituloRenderizado ||
    'O sistema identificou sinais de risco e recomenda avaliacao humana do ativo.';

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
        'overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md',
        style.border,
        alerta.status === 'Visto' ? 'opacity-70' : '',
      ].join(' ')}
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
                <h4 className="text-base font-bold leading-tight text-slate-800">
                  {alerta.titulo}
                </h4>

                {isRecomendacao ? (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                    Inteligente
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
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

                <span
                  className={[
                    'rounded-md px-2 py-1 text-[10px] font-black uppercase',
                    alerta.status === 'NaoVisto'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {alerta.status === 'NaoVisto' ? 'Não visto' : 'Visto'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:border-l md:border-slate-100 md:pl-5">
            <Link
              to={alerta.link || '#'}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 no-underline transition-all hover:bg-blue-600 hover:text-white"
              onClick={(event) => handleOpenLink(event)}
            >
              <FontAwesomeIcon icon={faEye} />
              Detalhes
            </Link>

            {alerta.status === 'Visto' ? (
              <button
                type="button"
                onClick={() => onUpdateStatus(alerta.id, 'NaoVisto')}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-amber-100 hover:text-amber-600"
                title="Marcar como não visto"
              >
                <FontAwesomeIcon icon={faEyeSlash} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(alerta.id, 'Visto')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-600 hover:text-white"
                  title="Marcar como visto"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>

                <button
                  type="button"
                  onClick={() => onDismiss(alerta.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Dispensar alerta"
                >
                  <FontAwesomeIcon icon={faBellSlash} />
                </button>
              </>
            )}
          </div>
        </div>

        {isRecomendacao ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-900">
                  Recomendação proativa
                </p>
                <p className="mt-1 text-sm text-violet-700">
                  {resumoRecomendacao}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {explicacao ? (
                  <button
                    type="button"
                    onClick={handleToggleExplicacao}
                    className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                  >
                    <FontAwesomeIcon
                      icon={showExplicacao ? faChevronUp : faChevronDown}
                    />
                    {showExplicacao ? 'Ocultar explicacao' : 'Ver explicacao'}
                  </button>
                ) : null}

                <Link
                  to={buildAgendarPreventivaLink(alerta)}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white no-underline transition hover:bg-violet-700"
                  onClick={(event) =>
                    handleOpenLink(event, buildAgendarPreventivaLink(alerta))
                  }
                >
                  <FontAwesomeIcon icon={faWrench} />
                  Agendar preventiva
                </Link>

                <Link
                  to={alerta.link || '#'}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 no-underline transition hover:bg-violet-100"
                  onClick={(event) => handleOpenLink(event)}
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  Ver ficha técnica
                </Link>
              </div>
            </div>

            {showExplicacao && explicacao ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-violet-500">
                  Explicacao analitica
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
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
