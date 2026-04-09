// Ficheiro: src/components/tabs/TabAnexos.jsx
// VERSÃO FINAL SÊNIOR - COM UI REFINADA

import React, { useRef, useState } from 'react';
import { useModal } from '../../../hooks/useModal';
import ModalConfirmacao from '../../ModalConfirmacao';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPaperclip, faUpload, faTrashAlt, faFilePdf, faFileImage, faFileWord, 
    faFileExcel, faFilePowerpoint, faFileArchive, faFileAudio, faFileVideo, 
    faFileAlt, faSpinner 
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../../contexts/ToastContext';
import { uploadAnexoEquipamento, deleteAnexoEquipamento } from '../../../services/api';
import { formatarData } from '../../../utils/timeUtils';

// URL base para downloads, lida das variáveis de ambiente do Vite.
const API_BASE_URL_DOWNLOAD = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Função utilitária mais completa para ícones e cores de ficheiro
const getIconePorTipoArquivo = (mimeType = '') => {
    if (mimeType.startsWith('image/')) return { icon: faFileImage, color: '#3B82F6' };
    if (mimeType === 'application/pdf') return { icon: faFilePdf, color: '#EF4444' };
    if (mimeType.includes('word')) return { icon: faFileWord, color: '#2563EB' };
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { icon: faFileExcel, color: '#16A34A' };
    if (mimeType.includes('powerpoint')) return { icon: faFilePowerpoint, color: '#D97706' };
    if (mimeType.startsWith('audio/')) return { icon: faFileAudio, color: '#9333EA' };
    if (mimeType.startsWith('video/')) return { icon: faFileVideo, color: '#DB2777' };
    if (mimeType.includes('zip') || mimeType.includes('archive')) return { icon: faFileArchive, color: '#78716C' };
    return { icon: faFileAlt, color: '#64748B' };
};

// Função para formatar o tamanho do ficheiro de bytes para KB/MB
const formatarTamanhoArquivo = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

function TabAnexos({ equipamentoId, anexosIniciais = [], onUpdate }) {
  const { addToast } = useToast();
  const { isOpen, modalData, openModal, closeModal } = useModal();
  const anexoInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnexosUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsSubmitting(true);
    const uploadData = new FormData();
    for (let i = 0; i < files.length; i++) {
        uploadData.append('anexosEquipamento', files[i]);
    }
    
    try {
      await uploadAnexoEquipamento(equipamentoId, uploadData);
      addToast('Anexo(s) enviado(s) com sucesso!', 'success');
      if (onUpdate) onUpdate();
    } catch (error) {
      addToast(error.response?.data?.message || 'Erro ao enviar anexo.', 'error');
    } finally {
      setIsSubmitting(false);
      if (anexoInputRef.current) anexoInputRef.current.value = null;
    }
  };

  const handleDeleteClick = (anexo) => {
    openModal(anexo);
  };

  const handleConfirmarExclusao = async () => {
    if (modalData) {
      setIsSubmitting(true);
      try {
        await deleteAnexoEquipamento(equipamentoId, modalData.id);
        addToast('Anexo excluído com sucesso!', 'success');
        if (onUpdate) onUpdate();
      } catch (error) {
        addToast(error.response?.data?.message || 'Erro ao excluir anexo.', 'error');
      } finally {
        setIsSubmitting(false);
        closeModal();
      }
    }
  };

  return (
    <>
      <ModalConfirmacao
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmarExclusao}
        title="Confirmar Exclusão de Anexo"
        message={`Tem certeza que deseja excluir o anexo "${modalData?.nomeOriginal}"?`}
        isDestructive={true}
      />
    
      <div>
        <div className="section-header">
          <h3 className="tab-title">
            <FontAwesomeIcon icon={faPaperclip} /> Anexos ({anexosIniciais.length})
          </h3>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => anexoInputRef.current?.click()} 
            disabled={isSubmitting}
          >
            <FontAwesomeIcon icon={isSubmitting ? faSpinner : faUpload} spin={isSubmitting} /> 
            {isSubmitting ? 'Enviando...' : 'Enviar Anexo'}
          </button>
          <input 
            type="file" 
            multiple 
            ref={anexoInputRef} 
            style={{ display: 'none' }} 
            onChange={handleAnexosUpload} 
            disabled={isSubmitting} 
          />
        </div>

        {anexosIniciais.length > 0 ? (
          <div className="anexos-grid-container">
            {anexosIniciais.map(anexo => {
              const { icon, color } = getIconePorTipoArquivo(anexo.tipoMime);
              return (
                <div key={anexo.id} className="anexo-card">
                  <div className="anexo-card-icon" style={{ backgroundColor: `${color}20`, color: color }}>
                    <FontAwesomeIcon icon={icon} />
                  </div>
                  <div className="anexo-card-details">
                    <a 
                      href={`${API_BASE_URL_DOWNLOAD}/${anexo.path}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="anexo-card-title"
                      title={anexo.nomeOriginal}
                    >
                      {anexo.nomeOriginal}
                    </a>
                    <div className="anexo-card-meta">
                      {/* O backend precisa fornecer o tamanho do arquivo para isso funcionar */}
                      {/* <span>{formatarTamanhoArquivo(anexo.tamanho || 0)}</span> */}
                      <span>{formatarData(anexo.createdAt)}</span>
                    </div>
                  </div>
                  <div className="anexo-card-actions">
                    <button 
                      onClick={() => handleDeleteClick(anexo)} 
                      className="btn-action delete" 
                      title="Excluir Anexo"
                      disabled={isSubmitting}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-data-message">Nenhum anexo encontrado para este equipamento.</p>
        )}
      </div>
    </>
  );
}

export default TabAnexos;