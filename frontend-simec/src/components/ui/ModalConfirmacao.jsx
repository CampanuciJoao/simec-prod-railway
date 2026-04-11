import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

function ModalConfirmacao({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Você tem certeza?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Fechar modal"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className="pr-10">
          <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
            {isDestructive && (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </span>
            )}
            <span>{title}</span>
          </h3>

          <div className="mt-4 text-sm leading-6 text-slate-600">
            <p>{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {cancelText}
          </button>

          <button
            type="button"
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