import React, { useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilePdf,
  faFileImage,
  faFileLines,
  faTrashAlt,
  faDownload,
  faCloudArrowUp,
} from '@fortawesome/free-solid-svg-icons';

function getAttachmentIcon(filename = '', mimeType = '') {
  const nome = String(filename || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();

  if (mime.includes('pdf') || nome.endsWith('.pdf')) {
    return { icon: faFilePdf, iconClassName: 'text-red-500' };
  }

  if (
    mime.includes('image') ||
    nome.endsWith('.png') ||
    nome.endsWith('.jpg') ||
    nome.endsWith('.jpeg') ||
    nome.endsWith('.webp')
  ) {
    return { icon: faFileImage, iconClassName: 'text-emerald-500' };
  }

  return { icon: faFileLines, iconClassName: 'text-slate-500' };
}

function CompactAttachmentList({
  attachments = [],
  uploadLabel = 'clique para selecionar',
  emptyMessage = 'Nenhum anexo.',
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  isUploading = false,
  isDeleting = false,
  multiple = false,
  onUpload,
  onDelete,
  getAttachmentName,
  getAttachmentUrl,
  className = '',
}) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const dispatchFiles = useCallback(async (files) => {
    if (!files.length || typeof onUpload !== 'function') return;
    try {
      await onUpload(multiple ? files : files[0]);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUpload, multiple]);

  const handleInputChange = async (e) => {
    await dispatchFiles(Array.from(e.target.files || []));
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    await dispatchFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

  return (
    <div className={['space-y-3', className].join(' ')}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors"
        style={{
          borderColor: isDragOver ? 'var(--brand-primary)' : 'var(--border-soft)',
          backgroundColor: isDragOver ? 'var(--brand-primary-soft)' : 'var(--bg-surface-soft)',
          opacity: isUploading ? 0.6 : 1,
          cursor: isUploading ? 'not-allowed' : 'default',
        }}
      >
        <FontAwesomeIcon
          icon={faCloudArrowUp}
          className="text-3xl"
          style={{ color: isDragOver ? 'var(--brand-primary)' : 'var(--text-muted)' }}
        />

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isUploading ? 'Enviando...' : (
            <>
              Arraste um arquivo aqui ou{' '}
              <label
                className="cursor-pointer font-medium underline-offset-2 hover:underline"
                style={{ color: isUploading ? 'var(--text-muted)' : 'var(--brand-primary)', pointerEvents: isUploading ? 'none' : 'auto' }}
              >
                {uploadLabel}
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  multiple={multiple}
                  accept={accept}
                  onChange={handleInputChange}
                  disabled={isUploading}
                />
              </label>
            </>
          )}
        </p>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          PDF, JPG, PNG, DOC, DOCX
        </p>
      </div>

      {/* File list */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const nome =
              typeof getAttachmentName === 'function'
                ? getAttachmentName(attachment)
                : attachment?.nomeOriginal || attachment?.name || 'Arquivo';

            const url =
              typeof getAttachmentUrl === 'function'
                ? getAttachmentUrl(attachment)
                : attachment?.url || attachment?.path || null;

            const { icon, iconClassName } = getAttachmentIcon(
              nome,
              attachment?.tipoMime || attachment?.mimeType || ''
            );

            return (
              <div
                key={attachment.id || nome}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FontAwesomeIcon icon={icon} className={iconClassName} />
                  <span className="truncate text-sm text-slate-700" title={nome}>
                    {nome}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Abrir anexo"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onDelete?.(attachment)}
                    disabled={isDeleting}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Excluir anexo"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">{emptyMessage}</p>
      )}
    </div>
  );
}

CompactAttachmentList.propTypes = {
  attachments: PropTypes.array,
  uploadLabel: PropTypes.string,
  emptyMessage: PropTypes.string,
  accept: PropTypes.string,
  isUploading: PropTypes.bool,
  isDeleting: PropTypes.bool,
  multiple: PropTypes.bool,
  onUpload: PropTypes.func,
  onDelete: PropTypes.func,
  getAttachmentName: PropTypes.func,
  getAttachmentUrl: PropTypes.func,
  className: PropTypes.string,
};

export default CompactAttachmentList;
