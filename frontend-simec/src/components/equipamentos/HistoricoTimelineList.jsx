import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faWrench,
  faExternalLinkAlt,
  faPaperclip,
  faFileDownload,
} from '@fortawesome/free-solid-svg-icons';

import {
  getCategoriaBadgeClass,
  getTimelineBorderClass,
  getTimelineIconClass,
  formatarDataHora,
} from '@/utils/equipamentos/historicoTimelineUtils';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function HistoricoTimelineList({
  linhaDoTempo,
  itensExpandidos,
  onToggleExpandir,
}) {
  return (
    <div className="space-y-4">
      {linhaDoTempo.map((item) => {
        const expandido = itensExpandidos.has(item.uniqueId);

        return (
          <div
            key={item.uniqueId}
            className={[
              'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
              'border-l-[8px]',
              getTimelineBorderClass(item),
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onToggleExpandir(item.uniqueId)}
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={[
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    getTimelineIconClass(item),
                  ].join(' ')}
                >
                  <FontAwesomeIcon icon={faWrench} />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.chamado
                        ? `${item.titulo} • Chamado: ${item.chamado}`
                        : item.titulo}
                    </h4>

                    <span className={getCategoriaBadgeClass(item)}>
                      {item.categoria}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{formatarDataHora(item.data)}</span>
                    <span>Responsável: {item.responsavel}</span>
                    <span>Status: {item.status}</span>
                  </div>
                </div>
              </div>

              <span className="shrink-0 pt-1 text-slate-400">
                <FontAwesomeIcon
                  icon={expandido ? faChevronUp : faChevronDown}
                />
              </span>
            </button>

            {expandido ? (
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5">
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Descrição
                    </span>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {item.descricao || 'Sem detalhes informados.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Responsável
                    </span>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {item.responsavel}
                    </p>
                  </div>

                  {item.solucao ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                        Solução técnica
                      </span>
                      <p className="mt-2 text-sm font-medium leading-6 text-emerald-800">
                        {item.solucao}
                      </p>
                    </div>
                  ) : null}

                  {item.isOS ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/manutencoes/${item.idOriginal}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                        <span>Abrir manutenção</span>
                      </Link>
                    </div>
                  ) : null}

                  {item.isOS && item.anexos?.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={faPaperclip}
                          className="text-slate-400"
                        />
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Documentos
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {item.anexos.map((file) => (
                          <a
                            key={file.id}
                            href={`${API_BASE_URL}/${file.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-blue-600 no-underline transition hover:bg-slate-100 hover:underline"
                          >
                            <FontAwesomeIcon icon={faFileDownload} />
                            <span>{file.nomeOriginal}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default HistoricoTimelineList;