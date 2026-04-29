import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faCommentDots,
  faCalendarCheck,
  faCircleInfo,
  faArrowUpRightFromSquare,
  faFileArrowDown,
  faPaperclip,
  faFilePen,
  faPencil,
  faPowerOff,
  faTrash,
  faTriangleExclamation,
  faWrench,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

import {
  Badge,
  Card,
  ExpandableTimelineItem,
  ModalConfirmacao,
  Textarea,
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

function AdminEventoActions({ eventoId, titulo, descricao, onDelete, onEdit }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');

  const handleOpenEdit = () => {
    setEditDescricao(descricao || '');
    setShowEdit(true);
  };

  const handleConfirmEdit = () => {
    setShowEdit(false);
    onEdit(eventoId, { descricao: editDescricao });
  };

  const handleConfirmDelete = () => {
    setShowDelete(false);
    onDelete(eventoId);
  };

  return (
    <>
      <div className="flex gap-1">
        <button
          type="button"
          title="Editar registro"
          onClick={handleOpenEdit}
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs transition hover:opacity-80"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}
        >
          <FontAwesomeIcon icon={faPencil} />
        </button>
        <button
          type="button"
          title="Excluir registro"
          onClick={() => setShowDelete(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs transition hover:opacity-80"
          style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-soft)' }}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>

      <ModalConfirmacao
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir registro do histórico"
        message={`Tem certeza que deseja excluir "${titulo}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive
      />

      <ModalConfirmacao
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onConfirm={handleConfirmEdit}
        title="Editar registro do histórico"
        message="Corrija a descrição deste registro."
        confirmText="Salvar"
        cancelText="Cancelar"
        confirmDisabled={!editDescricao.trim()}
      >
        <Textarea
          label="Descrição"
          value={editDescricao}
          onChange={(e) => setEditDescricao(e.target.value)}
          rows={3}
        />
      </ModalConfirmacao>
    </>
  );
}

AdminEventoActions.propTypes = {
  eventoId: PropTypes.string.isRequired,
  titulo: PropTypes.string,
  descricao: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};

const ACTION_LINK_STYLE = {
  color: 'var(--brand-primary)',
  backgroundColor: 'var(--brand-primary-soft)',
};

function buildItemAction(item) {
  if (item.referenciaTipo === 'os_corretiva' && item.referenciaId) {
    return (
      <Link
        to={`/manutencoes/ocorrencia/${item.referenciaId}`}
        title="Ver OS / Ocorrência"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl transition hover:opacity-75"
          style={ACTION_LINK_STYLE}
        >
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
        </span>
      </Link>
    );
  }

  if (item.referenciaTipo === 'manutencao' && item.referenciaId) {
    return (
      <Link
        to={`/manutencoes/detalhes/${item.referenciaId}`}
        title="Ver manutenção"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl transition hover:opacity-75"
          style={ACTION_LINK_STYLE}
        >
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
        </span>
      </Link>
    );
  }

  return null;
}

function HistoricoTimelineList({
  linhaDoTempo = [],
  itensExpandidos,
  onToggleExpandir,
  isAdmin = false,
  onDeleteEvento,
  onEditEvento,
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
                {item.eventos?.length > 1 ? (
                  <span>
                    {formatarDataHora(item.eventos[0].data)}
                    {' → '}
                    {formatarDataHora(item.eventos[item.eventos.length - 1].data)}
                  </span>
                ) : (
                  <span>{formatarDataHora(item.data)}</span>
                )}
                <span>Origem: {item.responsavel}</span>
                <span>Status: {item.status}</span>
                {item.eventos?.length > 1 ? (
                  <span>{item.eventos.length} etapas</span>
                ) : null}
                {item.contagemNotas ? <span>{item.contagemNotas} comentario(s)</span> : null}
                {item.contagemAnexos ? <span>{item.contagemAnexos} anexo(s)</span> : null}
              </>
            }
            icon={<FontAwesomeIcon icon={getTimelineIcon(item)} />}
            iconClassName={getTimelineIconClass(item)}
            borderClassName={getTimelineBorderClass(item)}
            expanded={expandido}
            onToggle={() => onToggleExpandir(item.uniqueId)}
            actions={buildItemAction(item)}
          >
            <div className="space-y-4">
              {item.eventos?.length > 1 ? (
                <Card surface="soft" className="rounded-2xl">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Progressao
                  </span>

                  <div className="mt-3 space-y-0">
                    {item.eventos.map((ev, idx) => (
                      <div key={ev.uniqueId} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: 'var(--brand-primary-soft)',
                              color: 'var(--brand-primary)',
                            }}
                          >
                            {idx + 1}
                          </div>
                          {idx < item.eventos.length - 1 ? (
                            <div
                              className="w-px flex-1 my-1"
                              style={{ backgroundColor: 'var(--border-soft)', minHeight: '12px' }}
                            />
                          ) : null}
                        </div>

                        <div className="pb-3 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {ev.status}
                            </span>
                            <FontAwesomeIcon
                              icon={faChevronRight}
                              className="text-[9px]"
                              style={{ color: 'var(--text-muted)' }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {formatarDataHora(ev.data)}
                            </span>
                            {ev.responsavel ? (
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                · {ev.responsavel}
                              </span>
                            ) : null}
                            {isAdmin && ev.eventoId ? (
                              <AdminEventoActions
                                eventoId={ev.eventoId}
                                titulo={ev.titulo || item.titulo}
                                descricao={ev.descricao}
                                onDelete={onDeleteEvento}
                                onEdit={onEditEvento}
                              />
                            ) : null}
                          </div>
                          {ev.descricao && ev.descricao !== 'Sem detalhes informados.' ? (
                            <p
                              className="mt-1 text-xs leading-5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {ev.descricao}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card surface="soft" className="rounded-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Descricao
                    </span>
                    {isAdmin && item.eventoId ? (
                      <AdminEventoActions
                        eventoId={item.eventoId}
                        titulo={item.titulo}
                        descricao={item.descricao}
                        onDelete={onDeleteEvento}
                        onEdit={onEditEvento}
                      />
                    ) : null}
                  </div>
                  <p
                    className="mt-2 text-sm leading-6"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.descricao || 'Sem detalhes informados.'}
                  </p>
                </Card>
              )}

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
  isAdmin: PropTypes.bool,
  onDeleteEvento: PropTypes.func,
  onEditEvento: PropTypes.func,
};

export default HistoricoTimelineList;
