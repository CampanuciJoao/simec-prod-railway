import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital,
  faMicrochip,
  faPaperclip,
  faEdit,
  faTrashAlt,
  faFilePdf,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import { Button } from '@/components/ui';
import CompactAttachmentList from '@/components/ui/feedback/CompactAttachmentList';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function ContratoExpandedDetails({
  contrato,
  uploadingId,
  onUploadArquivo,
  onDeleteAnexo,
  exportandoPdfId,
  onExportarPdf,
  onEdit,
  onDelete,
}) {
  const handleUpload = useCallback(
    (file) => onUploadArquivo(contrato.id, file),
    [contrato.id, onUploadArquivo]
  );

  const handleDelete = useCallback(
    (attachment) => onDeleteAnexo(contrato.id, attachment.id),
    [contrato.id, onDeleteAnexo]
  );

  const getAttachmentUrl = useCallback(
    (attachment) => `${API_BASE_URL}/${attachment.path}`,
    []
  );

  return (
    <div
      className="border-t p-5"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-subtle)',
      }}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        {/* Unidades cobertas */}
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-soft)',
          }}
        >
          <h5
            className="mb-3 flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            <FontAwesomeIcon
              icon={faHospital}
              style={{ color: 'var(--text-muted)' }}
            />
            Unidades cobertas
          </h5>

          <div className="flex flex-wrap gap-2">
            {contrato.unidadesCobertas?.length > 0 ? (
              contrato.unidadesCobertas.map((unidade) => (
                <span
                  key={unidade.id}
                  className="inline-flex rounded-full px-3 py-1 text-sm font-medium shadow-sm ring-1"
                  style={{
                    backgroundColor: 'var(--bg-surface-soft)',
                    color: 'var(--text-secondary)',
                    ringColor: 'var(--border-soft)',
                  }}
                >
                  {unidade.nomeSistema}
                </span>
              ))
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                Nenhuma unidade vinculada.
              </p>
            )}
          </div>
        </div>

        {/* Equipamentos vinculados */}
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-soft)',
          }}
        >
          <h5
            className="mb-3 flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            <FontAwesomeIcon
              icon={faMicrochip}
              style={{ color: 'var(--text-muted)' }}
            />
            Equipamentos vinculados ({contrato.equipamentosCobertos?.length || 0})
          </h5>

          <div className="max-h-[250px] overflow-y-auto pr-1">
            {contrato.equipamentosCobertos?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {contrato.equipamentosCobertos.map((equipamento) => (
                  <div
                    key={equipamento.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                    style={{
                      backgroundColor: 'var(--bg-surface-soft)',
                      borderColor: 'var(--border-soft)',
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {equipamento.modelo}
                    </span>

                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        ringColor: 'var(--border-soft)',
                      }}
                    >
                      {equipamento.tag}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                Sem equipamentos específicos.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div
        className="mt-5 rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
        }}
      >
        <h5
          className="mb-3 flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          <FontAwesomeIcon
            icon={faPaperclip}
            style={{ color: 'var(--text-muted)' }}
          />
          Documentos do contrato
        </h5>

        <CompactAttachmentList
          attachments={contrato.anexos || []}
          uploadLabel="clique para selecionar"
          emptyMessage="Nenhum documento anexado."
          isUploading={uploadingId === contrato.id}
          onUpload={handleUpload}
          onDelete={handleDelete}
          getAttachmentUrl={getAttachmentUrl}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onExportarPdf(contrato)}
          disabled={exportandoPdfId === contrato.id}
          title="Exportar contrato em PDF"
        >
          <FontAwesomeIcon
            icon={exportandoPdfId === contrato.id ? faSpinner : faFilePdf}
            spin={exportandoPdfId === contrato.id}
          />
          {exportandoPdfId === contrato.id ? 'Gerando...' : 'Exportar PDF'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onEdit(contrato.id)}
        >
          <FontAwesomeIcon icon={faEdit} />
          Editar
        </Button>

        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => onDelete(contrato)}
        >
          <FontAwesomeIcon icon={faTrashAlt} />
          Excluir
        </Button>
      </div>
    </div>
  );
}

ContratoExpandedDetails.propTypes = {
  contrato: PropTypes.object.isRequired,
  uploadingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onUploadArquivo: PropTypes.func.isRequired,
  onDeleteAnexo: PropTypes.func.isRequired,
  exportandoPdfId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onExportarPdf: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ContratoExpandedDetails;
