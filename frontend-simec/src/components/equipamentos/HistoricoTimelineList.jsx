import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faCommentDots,
  faCalendarCheck,
  faCircleInfo,
  faExternalLinkAlt,
  faFileArrowDown,
  faPaperclip,
  faFilePen,
  faPowerOff,
  faTriangleExclamation,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Badge,
  Button,
  Card,
  ExpandableTimelineItem,
} from '@/components/ui';

import {
  getTimelineBorderClass,
  getTimelineIconClass,
  formatarDataHora,
} from '@/utils/equipamentos/historicoTimelineUtils';

function getTimelineIcon(item) {
  if (item.subcategoria === 'Corretiva' || item.subcategoria === 'Preventiva') {
    return faWrench;
  }

  if (item.categoriaBase === 'ocorrencia') return faTriangleExclamation;
  if (item.categoriaBase === 'transferencia_unidade') return faArrowsRotate;
  if (item.categoriaBase === 'instalacao') return faCalendarCheck;
  if (item.categoriaBase === 'alteracao_cadastral') return faFilePen;
  if (item.categoriaBase === 'status_operacional') return faPowerOff;

  return faCircleInfo;
}

function HistoricoTimelineList({
  linhaDoTempo = [],
  itensExpandidos,
  onToggleExpandir,
}) {
  const renderAttachmentLink = (attachment, item) => (
    <a
      key={`${item.uniqueId}-${attachment.id}`}
      href={attachment.path}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
      }}
    >
      <span className="min-w-0 truncate" title={attachment.nomeOriginal}>
        {attachment.nomeOriginal}
      </span>
      <FontAwesomeIcon icon={faFileArrowDown} />
    </a>
  );

  return (
    <div className="space-y-4">
      {linhaDoTempo.map((item) => {
        const expandido = itensExpandidos.has(item.uniqueId);

        return (
          <ExpandableTimelineItem
            key={item.uniqueId}
            title={
              item.chamado
                ? `${item.titulo} | Chamado: ${item.chamado}`
                : item.titulo
            }
            badge={<Badge variant="slate">{item.categoria}</Badge>}
            meta={
              <>
                <span>{formatarDataHora(item.data)}</span>
                <span>Origem: {item.responsavel}</span>
                <span>Status: {item.status}</span>
                {item.contagemNotas ? <span>{item.contagemNotas} comentario(s)</span> : null}
                {item.contagemAnexos ? <span>{item.contagemAnexos} anexo(s)</span> : null}
              </>
            }
            icon={<FontAwesomeIcon icon={getTimelineIcon(item)} />}
            iconClassName={getTimelineIconClass(item)}
            borderClassName={getTimelineBorderClass(item)}
            expanded={expandido}
            onToggle={() => onToggleExpandir(item.uniqueId)}
          >
            <div className="space-y-4">
              <Card surface="soft" className="rounded-2xl">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Descricao
                </span>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.descricao || 'Sem detalhes informados.'}
                </p>
              </Card>

              {item.resumoOperacional?.length ? (
                <Card surface="soft" className="rounded-2xl">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Contexto operacional
                  </span>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {item.resumoOperacional.map((detalhe) => (
                      <div
                        key={`${item.uniqueId}-${detalhe.label}`}
                        className="rounded-xl border px-3 py-3"
                        style={{
                          borderColor: 'var(--border-soft)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        <div
                          className="text-[11px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {detalhe.label}
                        </div>
                        <div
                          className="mt-1 text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {detalhe.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {item.detalhesComplementares?.length ? (
                <Card surface="soft" className="rounded-2xl">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Detalhes do registro
                  </span>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.detalhesComplementares.map((detalhe) => (
                      <span
                        key={`${item.uniqueId}-${detalhe.label}`}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium"
                        style={{
                          borderColor: 'var(--border-soft)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {detalhe.label}:
                        </strong>{' '}
                        {detalhe.value}
                      </span>
                    ))}
                  </div>
                </Card>
              ) : null}

              {item.notasAndamento?.length ? (
                <Card surface="soft" className="rounded-2xl">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faCommentDots}
                      style={{ color: 'var(--brand-primary)' }}
                    />
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Comentarios e notas da OS
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {item.notasAndamento.map((nota) => (
                      <div
                        key={`${item.uniqueId}-${nota.id}`}
                        className="rounded-xl border px-4 py-3"
                        style={{
                          borderColor: 'var(--border-soft)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        <p
                          className="text-sm leading-6"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {nota.nota}
                        </p>
                        <div
                          className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <span>{nota.autor?.nome || 'Sistema'}</span>
                          {nota.data ? <span>{formatarDataHora(nota.data)}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {item.anexos?.length ? (
                <Card surface="soft" className="rounded-2xl">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faPaperclip}
                      style={{ color: 'var(--color-danger)' }}
                    />
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Anexos relacionados
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {item.anexos.map((attachment) =>
                      renderAttachmentLink(attachment, item)
                    )}
                  </div>
                </Card>
              ) : null}

              {item.referenciaTipo === 'manutencao' && item.referenciaId ? (
                <Link to={`/manutencoes/detalhes/${item.referenciaId}`}>
                  <Button type="button" variant="secondary">
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Abrir manutencao
                  </Button>
                </Link>
              ) : null}
            </div>
          </ExpandableTimelineItem>
        );
      })}
    </div>
  );
}

HistoricoTimelineList.propTypes = {
  linhaDoTempo: PropTypes.array,
  itensExpandidos: PropTypes.instanceOf(Set).isRequired,
  onToggleExpandir: PropTypes.func.isRequired,
};

export default HistoricoTimelineList;
