// src/components/Modal.jsx
import React from 'react';


function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = "Confirmar", cancelText = "Cancelar", showConfirmButton = true, showCancelButton = true }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-actions">
          {showCancelButton && <button onClick={onClose} className="btn btn-secondary">{cancelText}</button>}
          {showConfirmButton && onConfirm && <button onClick={onConfirm} className="btn btn-primary">{confirmText}</button>}
        </div>
      </div>
    </div>
  );
}

export default Modal;