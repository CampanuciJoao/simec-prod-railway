// src/components/ModalConfirmacao.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

function ModalConfirmacao({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Ação",
  message = "Você tem certeza?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false // Para botões de confirmação vermelhos (ex: excluir)
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-action" onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center' }}>
          {isDestructive && <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '10px', color: 'var(--btn-danger-bg-light)' }} />}
          {title}
        </h3>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacao;