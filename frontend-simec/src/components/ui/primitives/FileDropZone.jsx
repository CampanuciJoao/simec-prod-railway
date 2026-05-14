// FileDropZone — area de upload com drag-and-drop nativo + clique fallback.
//
// Padrao do SIMEC para todo import de PDF (e arquivos em geral). Aceita
// arrastar arquivos do explorer/finder direto sobre a area, com feedback
// visual durante o hover. Originalmente baseado no padrao do SeguroForm.
//
// Uso:
//   <FileDropZone
//     accept="application/pdf"          // mime types ou extensoes
//     multiple
//     disabled={extraindo}
//     loading={extraindo}
//     loadingLabel="Lendo PDF com IA..."
//     onFiles={(files) => setArquivos(files)}
//     hint="PDF, JPG ou PNG"
//   />

import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

function matchesAccept(file, accept) {
  if (!accept) return true;
  const tokens = accept.split(',').map((s) => s.trim().toLowerCase());
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return tokens.some((t) => {
    if (!t) return false;
    if (t.startsWith('.')) return name.endsWith(t);
    if (t.endsWith('/*')) return type.startsWith(t.slice(0, -1));
    return type === t;
  });
}

function FileDropZone({
  onFiles,
  accept = '',
  multiple = false,
  disabled = false,
  loading = false,
  loadingLabel = null,
  label = 'Arraste o arquivo aqui ou',
  ctaLabel = 'clique para selecionar',
  hint = null,
  icon = faCloudArrowUp,
  className = '',
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handle = (files) => {
    const arr = Array.from(files || []);
    const valid = accept ? arr.filter((f) => matchesAccept(f, accept)) : arr;
    if (valid.length === 0) return;
    onFiles?.(valid);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || loading) return;
    handle(e.dataTransfer?.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled || loading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

  const handleSelect = (e) => {
    handle(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const desabilitado = disabled || loading;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
        desabilitado ? 'cursor-not-allowed opacity-70' : '',
        className,
      ].join(' ')}
      style={{
        borderColor: isDragOver ? 'var(--brand-primary)' : 'var(--border-soft)',
        backgroundColor: isDragOver
          ? 'var(--brand-primary-soft)'
          : 'var(--bg-surface-soft)',
      }}
    >
      <FontAwesomeIcon
        icon={loading ? faSpinner : icon}
        spin={loading}
        className="text-3xl"
        style={{ color: isDragOver ? 'var(--brand-primary)' : 'var(--text-muted)' }}
      />

      {loading ? (
        <p className="text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
          {loadingLabel || 'Processando...'}
        </p>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}{' '}
          <label
            className={[
              'font-medium underline-offset-2 hover:underline',
              desabilitado ? 'cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
            style={{ color: 'var(--brand-primary)' }}
          >
            {ctaLabel}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept || undefined}
              multiple={multiple}
              disabled={desabilitado}
              onChange={handleSelect}
            />
          </label>
        </p>
      )}

      {hint ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

FileDropZone.propTypes = {
  onFiles: PropTypes.func.isRequired,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  label: PropTypes.string,
  ctaLabel: PropTypes.string,
  hint: PropTypes.string,
  icon: PropTypes.object,
  className: PropTypes.string,
};

export default FileDropZone;
