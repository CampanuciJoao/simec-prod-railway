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
      <PageSection
        title="Histórico de andamento"
        description="Registre acontecimentos, observações técnicas e evolução da ordem de serviço."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FontAwesomeIcon icon={faTimeline} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Acontecimentos da manutenção
              </p>
              <p className="text-sm text-slate-500">
                Registre visitas, testes, peças trocadas, diagnósticos e observações de campo.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              rows={4}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              disabled={submitting}
              placeholder="Ex.: Equipamento reiniciado, testes executados, aguardando peça, visita técnica realizada..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAdicionarNota}
                disabled={submitting || !nota.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Registrar acontecimento
              </button>
            </div>
          </div>

          {notas.length > 0 ? (
            <div className="space-y-3">
              {notas.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="text-sm text-slate-800">{item.nota}</div>

                  <div className="mt-2 text-xs text-slate-500">
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

      <PageSection
        title="Anexos da OS"
        description="Arquivos vinculados à ordem de serviço."
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
              <FontAwesomeIcon icon={faPaperclip} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Anexar OS
              </p>
              <p className="text-sm text-slate-500">
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

HistoricoEAnexosManutencaoSection.propTypes = {
  manutencao: PropTypes.object,
  onAdicionarNota: PropTypes.func.isRequired,
  onUploadAnexos: PropTypes.func.isRequired,
  onRemoverAnexo: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default HistoricoEAnexosManutencaoSection;