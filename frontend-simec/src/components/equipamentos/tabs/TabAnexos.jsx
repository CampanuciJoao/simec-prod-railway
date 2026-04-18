import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperclip,
  faUpload,
  faSpinner,
  faFilePdf,
  faFileImage,
  faFileWord,
  faFileExcel,
  faFileAlt,
} from '@fortawesome/free-solid-svg-icons';

import { useResourceAnexos } from '@/hooks/shared/useResourceAnexos';

import AnexosList from '@/components/equipamentos/AnexosList';

import {
  ModalConfirmacao,
  PageSection,
  Button,
} from '@/components/ui';

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
        description="Documentos vinculados ao equipamento."
        headerRight={(
          <Button
            type="button"
            size="sm"
            onClick={openFileDialog}
            disabled={isSubmitting}
          >
            <FontAwesomeIcon
              icon={isSubmitting ? faSpinner : faUpload}
              spin={isSubmitting}
            />
            {isSubmitting ? 'Enviando...' : 'Anexar arquivo'}
          </Button>
        )}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
              }}
            >
              <FontAwesomeIcon icon={faPaperclip} />
            </span>

            <div className="min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Arquivos do equipamento
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Faca upload e mantenha documentos tecnicos ou administrativos.
              </p>
            </div>
          </div>

          <input
            type="file"
            multiple
            ref={inputRef}
            className="hidden"
            onChange={handleInputChange}
            disabled={isSubmitting}
          />

          {error ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'var(--color-danger-soft)',
                backgroundColor: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
              }}
            >
              {error}
            </div>
          ) : null}

          <AnexosList
            anexos={anexos}
            isSubmitting={isSubmitting}
            onDelete={openDeleteModal}
            getIconePorTipoArquivo={getIconePorTipoArquivo}
            montarUrlDownload={montarUrlDownload}
          />
        </div>
      </PageSection>
    </>
  );
}

export default TabAnexos;
