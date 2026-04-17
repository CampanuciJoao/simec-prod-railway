import React from 'react';
import PropTypes from 'prop-types';
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
  Button,
  Card,
} from '@/components/ui';

import {
  getCategoriaBadgeClass,
  getTimelineBorderClass,
  getTimelineIconClass,
  formatarDataHora,
} from '@/utils/equipamentos/historicoTimelineUtils';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function HistoricoTimelineList({
  linhaDoTempo = [],
  itensExpandidos,
  onToggleExpandir,
}) {
  return (
    <div className="space-y-4">
      {linhaDoTempo.map((item) => {
        const expandido = itensExpandidos.has(item.uniqueId);

        return (
          <Card
            key={item.uniqueId}
            padded={false}
            className={[
              'overflow-hidden rounded-3xl border border-l-[8px] shadow-sm',
              getTimelineBorderClass(item),
            ].join(' ')}
            surface="default"
            styleOverride={{
              backgroundColor: 'var(--section-surface)',
              borderColor: 'var(--border-soft)',
            }}
          >
            <button
              type="button"
              onClick={() => onToggleExpandir(item.uniqueId)}
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-black/0"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={[
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    getTimelineIconClass(item),
                  ].join(' ')}
                >
                  <FontAwesomeIcon icon={faWrench} />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className="text-sm font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.chamado
                        ? `${item.titulo} • Chamado: ${item.chamado}`
                        : item.titulo}
                    </h4>

                    <span className={getCategoriaBadgeClass(item)}>
                      {item.categoria}
                    </span>
                  </div>

                  <div
                    className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{formatarDataHora(item.data)}</span>
                    <span>Responsável: {item.responsavel}</span>
                    <span>Status: {item.status}</span>
                  </div>
                </div>
              </div>

              <span
                className="shrink-0 pt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                <FontAwesomeIcon
                  icon={expandido ? faChevronUp : faChevronDown}
                />
              </span>
            </button>

            {expandido ? (
              <div
                className="px-5 py-5"
                style={{
                  borderTop: '1px solid var(--section-header-border)',
                  backgroundColor: 'var(--bg-surface-soft)',
                }}
              >
                <div className="space-y-4">
                  <Card
                    className="rounded-2xl"
                    surface="default"
                  >
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Descrição
                    </span>
                    <p
                      className="mt-2 text-sm leading-6"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.descricao || 'Sem detalhes informados.'}
                    </p>
                  </Card>

                  <Card
                    className="rounded-2xl"
                    surface="default"
                  >
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Responsável
                    </span>
                    <p
                      className="mt-2 text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.responsavel}
                    </p>
                  </Card>

                  {item.solucao ? (
                    <Card
                      className="rounded-2xl"
                      surface="soft"
                      styleOverride={{
                        borderColor: 'var(--color-success-soft)',
                        backgroundColor: 'var(--color-success-soft)',
                      }}
                    >
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: 'var(--color-success)' }}
                      >
                        Solução técnica
                      </span>
                      <p
                        className="mt-2 text-sm font-medium leading-6"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.solucao}
                      </p>
                    </Card>
                  ) : null}

                  {item.isOS ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          window.location.href = `/manutencoes/${item.idOriginal}`;
                        }}
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                        <span>Abrir manutenção</span>
                      </Button>
                    </div>
                  ) : null}

                  {item.isOS && item.anexos?.length > 0 ? (
                    <Card
                      className="rounded-2xl"
                      surface="default"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={faPaperclip}
                          style={{ color: 'var(--text-muted)' }}
                        />
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.14em]"
                          style={{ color: 'var(--text-muted)' }}
                        >
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
                            className="inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold no-underline transition hover:underline"
                            style={{
                              borderColor: 'var(--border-soft)',
                              backgroundColor: 'var(--bg-surface-soft)',
                              color: 'var(--brand-primary)',
                            }}
                          >
                            <FontAwesomeIcon icon={faFileDownload} />
                            <span>{file.nomeOriginal}</span>
                          </a>
                        ))}
                      </div>
                    </Card>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

HistoricoTimelineList.propTypes = {
  linhaDoTempo: PropTypes.arrayOf(
    PropTypes.shape({
      uniqueId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      titulo: PropTypes.string,
      chamado: PropTypes.string,
      categoria: PropTypes.string,
      data: PropTypes.any,
      responsavel: PropTypes.string,
      status: PropTypes.string,
      descricao: PropTypes.string,
      solucao: PropTypes.string,
      isOS: PropTypes.bool,
      idOriginal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      anexos: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          path: PropTypes.string,
          nomeOriginal: PropTypes.string,
        })
      ),
    })
  ),
  itensExpandidos: PropTypes.instanceOf(Set).isRequired,
  onToggleExpandir: PropTypes.func.isRequired,
};

export default HistoricoTimelineList;