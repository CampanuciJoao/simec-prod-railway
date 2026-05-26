import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faDownload, faSpinner, faFilePdf, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui';
import { carregarOrcamentoPdfBlobUrl, exportarOrcamentoPDF } from '@/services/api/pdfApi';

// Modal fullscreen com iframe que renderiza o PDF inline via blob: URL.
// Browsers modernos (Chrome, Edge, Firefox) tem PDF viewer nativo —
// usuario pode dar zoom, navegar paginas, etc. Pra baixar, botao
// secundario explicito no header.
function PreviewOrcamentoPdfModal({ isOpen, orcamentoId, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !orcamentoId) return undefined;

    let url = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    carregarOrcamentoPdfBlobUrl(orcamentoId)
      .then((u) => {
        if (cancelled) {
          window.URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setBlobUrl(u);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Não foi possível carregar o preview do PDF.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [isOpen, orcamentoId]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 border-b px-5 py-3"
        style={{
          backgroundColor: 'var(--bg-elevated, #1e293b)',
          borderColor: 'var(--border-default, #334155)',
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          <FontAwesomeIcon icon={faFilePdf} />
          Preview do orçamento
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => exportarOrcamentoPDF(orcamentoId)}
            disabled={loading || Boolean(error)}
            title="Baixar este PDF"
          >
            <FontAwesomeIcon icon={faDownload} />
            <span className="ml-2">Baixar</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Fechar preview"
          >
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </div>
      </div>

      {/* Conteudo: iframe nativo do PDF */}
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: '#525659' }}>
        {loading && (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#e2e8f0' }}>
            <FontAwesomeIcon icon={faSpinner} spin />
            Carregando preview...
          </div>
        )}
        {error && !loading && (
          <div className="flex max-w-md flex-col items-center gap-2 text-center text-sm" style={{ color: '#fca5a5' }}>
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-2xl" />
            <p className="font-semibold">Falha ao gerar preview</p>
            <p style={{ color: '#cbd5e1' }}>{error}</p>
          </div>
        )}
        {blobUrl && !loading && !error && (
          <iframe
            src={blobUrl}
            title="Preview do orçamento"
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}

PreviewOrcamentoPdfModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  orcamentoId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

PreviewOrcamentoPdfModal.defaultProps = {
  orcamentoId: null,
};

export default PreviewOrcamentoPdfModal;
