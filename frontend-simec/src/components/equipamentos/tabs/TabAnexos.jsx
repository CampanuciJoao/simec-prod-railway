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

        <div className="mb-5 flex justify-end">
          <Button
            type="button"
            onClick={openFileDialog}
            disabled={isSubmitting}
          >
            <FontAwesomeIcon
              icon={isSubmitting ? faSpinner : faUpload}
              spin={isSubmitting}
            />
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
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
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
      </PageSection>
    </>
  );
}

export default TabAnexos;