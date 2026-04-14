import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperclip,
  faUpload,
  faSpinner,
  faTrashAlt,
  faFilePdf,
  faFileImage,
  faFileWord,
  faFileExcel,
  faFileAlt,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';

import ModalConfirmacao from '../../ui/feedback/ModalConfirmacao';
import PageSection from '../../ui/PageSection';
import { ActionBar, EmptyState } from '../../ui/layout';
import { formatarData } from '../../../utils/timeUtils';
import { useResourceAnexos } from '../../../hooks/shared/useResourceAnexos';

const API_BASE_URL_DOWNLOAD =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function getIconePorTipoArquivo(tipoMime = '') {
  const mime = String(tipoMime).toLowerCase();

  if (mime.includes('pdf')) {
    return { icon: faFilePdf, colorClass: 'text-red-500' };
  }

  if (mime.includes('image')) {
    return { icon: faFileImage, colorClass: 'text-emerald-500' };
  }

  if (mime.includes('word') || mime.includes('document')) {
    return { icon: faFileWord, colorClass: 'text-blue-600' };
  }

  if (
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('sheet')
  ) {
    return { icon: faFileExcel, colorClass: 'text-green-600' };
  }

  return { icon: faFileAlt, colorClass: 'text-slate-500' };
}

function montarUrlDownload(pathArquivo = '') {
  if (!pathArquivo) return '#';

  if (
    String(pathArquivo).startsWith('http://') ||
    String(pathArquivo).startsWith('https://')
  ) {
    return pathArquivo;
  }

  const normalizedPath = String(pathArquivo).startsWith('/')
    ? pathArquivo
    : `/${pathArquivo}`;

  return `${API_BASE_URL_DOWNLOAD}${normalizedPath}`;
}

function TabAnexos({ equipamentoId, anexosIniciais = [], onUpdate }) {
  const {
    anexos,
    error,
    isSubmitting,
    inputRef,
    deleteModalOpen,
    anexoSelecionado,
    openFileDialog,
    openDeleteModal,
    closeDeleteModal,
    handleInputChange,
    confirmDelete,
  } = useResourceAnexos({
    resource: 'equipamentos',
    resourceId: equipamentoId,
    anexosIniciais,
    onUpdate,
  });

  return (
    <>
      <ModalConfirmacao
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Excluir anexo"
        message={`Deseja excluir o arquivo "${anexoSelecionado?.nomeOriginal || ''}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive
      />

      <PageSection
        title={`Anexos (${anexos.length})`}
        description="Documentos vinculados ao equipamento"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faPaperclip} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Arquivos do equipamento
            </p>
            <p className="text-sm text-slate-500">
              Faça upload e mantenha documentos técnicos ou administrativos
            </p>
          </div>
        </div>

        <ActionBar
          className="mb-5"
          right={
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto"
              onClick={openFileDialog}
              disabled={isSubmitting}
            >
              <FontAwesomeIcon
                icon={isSubmitting ? faSpinner : faUpload}
                spin={isSubmitting}
              />
              <span>{isSubmitting ? 'Enviando...' : 'Enviar'}</span>
            </button>
          }
        />

        <input
          type="file"
          multiple
          ref={inputRef}
          className="hidden"
          onChange={handleInputChange}
          disabled={isSubmitting}
        />

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {anexos.length === 0 ? (
          <EmptyState message="Nenhum anexo vinculado a este equipamento." />
        ) : (
          <div className="flex flex-col gap-3">
            {anexos.map((anexo) => {
              const { icon, colorClass } = getIconePorTipoArquivo(
                anexo.tipoMime
              );

              const downloadUrl = montarUrlDownload(anexo.path);

              return (
                <div
                  key={anexo.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={[
                        'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50',
                        colorClass,
                      ].join(' ')}
                    >
                      <FontAwesomeIcon icon={icon} />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {anexo.nomeOriginal || 'Arquivo sem nome'}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{anexo.tipoMime || 'Tipo desconhecido'}</span>
                        <span>
                          Enviado em {formatarData(anexo.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50"
                      title="Baixar / abrir anexo"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                    </a>

                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      title="Excluir anexo"
                      onClick={() => openDeleteModal(anexo)}
                      disabled={isSubmitting}
                    >
                      <FontAwesomeIcon
                        icon={isSubmitting ? faSpinner : faTrashAlt}
                        spin={isSubmitting}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </>
  );
}

export default TabAnexos;