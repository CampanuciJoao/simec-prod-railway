import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimeline,
  faPaperclip,
} from '@fortawesome/free-solid-svg-icons';

import {
  PageSection,
  CompactAttachmentList,
  EmptyState,
  Textarea,
  Button,
} from '@/components/ui';

function HistoricoEAnexosManutencaoSection({
  manutencao,
  onAdicionarNota,
  onUploadAnexos,
  onRemoverAnexo,
  submitting,
}) {
  const [nota, setNota] = useState('');

  const notas = Array.isArray(manutencao?.notasAndamento)
    ? manutencao.notasAndamento
    : [];

  const anexos = Array.isArray(manutencao?.anexos)
    ? manutencao.anexos
    : [];

  const handleAdicionarNota = async () => {
    const valor = nota.trim();
    if (!valor) return;

    await onAdicionarNota(valor);
    setNota('');
  };

  const handleUpload = async (filesOrFile) => {
    const files = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];
    if (!files.length) return;

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('file', file);
    });

    await onUploadAnexos(formData);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      {/* HISTÓRICO */}
      <PageSection title="Histórico de andamento">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
              }}
            >
              <FontAwesomeIcon icon={faTimeline} />
            </span>

            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Acontecimentos da manutenção
              </p>

              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Registre visitas, testes, peças trocadas e observações.
              </p>
            </div>
          </div>

          <Textarea
            rows={4}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            disabled={submitting}
            placeholder="Ex.: Equipamento reiniciado, testes executados..."
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAdicionarNota}
              disabled={submitting || !nota.trim()}
            >
              Registrar acontecimento
            </Button>
          </div>

          {notas.length > 0 ? (
            <div className="space-y-3">
              {notas.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor: 'var(--bg-surface-soft)',
                    borderColor: 'var(--border-soft)',
                  }}
                >
                  <div
                    className="text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.nota}
                  </div>

                  <div
                    className="mt-2 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.autor?.nome || 'Sistema'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhum acontecimento registrado nesta OS." />
          )}
        </div>
      </PageSection>

      {/* ANEXOS */}
      <PageSection title="Anexos da OS">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
              }}
            >
              <FontAwesomeIcon icon={faPaperclip} />
            </span>

            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Anexar documentos
              </p>

              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                PDFs, imagens e laudos da manutenção.
              </p>
            </div>
          </div>

          <CompactAttachmentList
            attachments={anexos}
            uploadLabel="Anexar OS"
            emptyMessage="Nenhum anexo enviado para esta OS."
            isUploading={submitting}
            isDeleting={submitting}
            multiple
            onUpload={handleUpload}
            onDelete={(attachment) => onRemoverAnexo(attachment.id)}
            getAttachmentName={(attachment) => attachment.nomeOriginal}
            getAttachmentUrl={(attachment) => attachment.path}
          />
        </div>
      </PageSection>
    </div>
  );
}

export default HistoricoEAnexosManutencaoSection;