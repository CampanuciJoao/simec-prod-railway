import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperclip,
  faFilePdf,
  faFileImage,
  faFileLines,
  faTrashAlt,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';

function getAttachmentIcon(filename = '', mimeType = '') {
  const nome = String(filename || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();

  if (mime.includes('pdf') || nome.endsWith('.pdf')) {
    return {
      icon: faFilePdf,
      iconClassName: 'text-red-500',
    };
  }

  if (
    mime.includes('image') ||
    nome.endsWith('.png') ||
    nome.endsWith('.jpg') ||
    nome.endsWith('.jpeg') ||
    nome.endsWith('.webp')
  ) {
    return {
      icon: faFileImage,
      iconClassName: 'text-emerald-500',
    };
  }

  return {
    icon: faFileLines,
    iconClassName: 'text-slate-500',
  };
}

function CompactAttachmentList({
  attachments = [],
  uploadLabel = 'Anexar arquivo',
  emptyMessage = 'Nenhum anexo.',
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

  const handleOpenFileDialog = () => {
    if (isUploading) return;
    inputRef.current?.click();
  };

  const handleInputChange = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length || typeof onUpload !== 'function') {
      event.target.value = '';
      return;
    }

    try {
      await onUpload(multiple ? files : files[0]);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className={['space-y-3', className].join(' ')}>
      <div>
        <button
          type="button"
          onClick={handleOpenFileDialog}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faPaperclip} />
          {isUploading ? 'Enviando...' : uploadLabel}
        </button>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          onChange={handleInputChange}
          disabled={isUploading}
        />
      </div>

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