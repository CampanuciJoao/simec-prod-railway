import React, { useRef, useState } from 'react';
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
} from '@fortawesome/free-solid-svg-icons';

import ModalConfirmacao from '../../ui/ModalConfirmacao';
import { formatarData } from '../../../utils/timeUtils';
import * as api from '../../../services/api';

const API_BASE_URL_DOWNLOAD =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function getIconePorTipoArquivo(tipoMime = '') {
  const mime = String(tipoMime).toLowerCase();

  if (mime.includes('pdf')) {
    return { icon: faFilePdf, color: '#ef4444' };
  }

  if (mime.includes('image')) {
    return { icon: faFileImage, color: '#10b981' };
  }

  if (mime.includes('word') || mime.includes('document')) {
    return { icon: faFileWord, color: '#2563eb' };
  }

  if (
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('sheet')
  ) {
    return { icon: faFileExcel, color: '#16a34a' };
  }

  return { icon: faFileAlt, color: '#64748b' };
}

function getUploadFn() {
  return (
    api.uploadAnexosEquipamento ||
    api.uploadAnexoEquipamento ||
    api.enviarAnexosEquipamento ||
    api.enviarAnexoEquipamento ||
    null
  );
}

function getDeleteFn() {
  return (
    api.deleteAnexoEquipamento ||
    api.deleteAnexo ||
    api.removerAnexoEquipamento ||
    api.removerAnexo ||
    api.excluirAnexoEquipamento ||
    api.excluirAnexo ||
    null
  );
}

function TabAnexos({ equipamentoId, anexosIniciais = [], onUpdate }) {
  const anexoInputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [anexoSelecionado, setAnexoSelecionado] = useState(null);

  const handleDeleteClick = (anexo) => {
    setAnexoSelecionado(anexo);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!anexoSelecionado) return;

    const deleteFn = getDeleteFn();

    if (!deleteFn) {
      console.error(
        'Nenhuma função de exclusão de anexo foi encontrada em services/api.'
      );
      setDeleteModalOpen(false);
      setAnexoSelecionado(null);
      return;
    }

    try {
      setIsSubmitting(true);
      await deleteFn(anexoSelecionado.id);

      if (typeof onUpdate === 'function') {
        await onUpdate();
      }
    } catch (error) {
      console.error('Erro ao excluir anexo:', error);
    } finally {
      setIsSubmitting(false);
      setDeleteModalOpen(false);
      setAnexoSelecionado(null);
    }
  };

  const handleAnexosUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const uploadFn = getUploadFn();

    if (!uploadFn) {
      console.error(
        'Nenhuma função de upload de anexos foi encontrada em services/api.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      files.forEach((file) => formData.append('anexos', file));

      await uploadFn(equipamentoId, formData);

      if (typeof onUpdate === 'function') {
        await onUpdate();
      }
    } catch (error) {
      console.error('Erro ao enviar anexos:', error);
    } finally {
      setIsSubmitting(false);
      if (anexoInputRef.current) {
        anexoInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <ModalConfirmacao
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setAnexoSelecionado(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir anexo"
        message={`Deseja excluir o arquivo "${anexoSelecionado?.nomeOriginal || ''}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive
      />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FontAwesomeIcon icon={faPaperclip} />
            </span>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Anexos ({anexosIniciais.length})
              </h3>
              <p className="text-sm text-slate-500">
                Documentos vinculados ao equipamento
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => anexoInputRef.current?.click()}
            disabled={isSubmitting}
          >
            <FontAwesomeIcon
              icon={isSubmitting ? faSpinner : faUpload}
              spin={isSubmitting}
            />
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>

          <input
            type="file"
            multiple
            ref={anexoInputRef}
            className="hidden"
            onChange={handleAnexosUpload}
            disabled={isSubmitting}
          />
        </div>

        {anexosIniciais.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {anexosIniciais.map((anexo) => {
              const { icon, color } = getIconePorTipoArquivo(anexo.tipoMime);

              return (
                <div
                  key={anexo.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <FontAwesomeIcon icon={icon} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <a
                      href={`${API_BASE_URL_DOWNLOAD}/${anexo.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {anexo.nomeOriginal}
                    </a>

                    <span className="text-xs text-slate-400">
                      {formatarData(anexo.createdAt)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteClick(anexo)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                    disabled={isSubmitting}
                    title="Excluir anexo"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nenhum anexo encontrado.
          </div>
        )}
      </div>
    </>
  );
}

export default TabAnexos;