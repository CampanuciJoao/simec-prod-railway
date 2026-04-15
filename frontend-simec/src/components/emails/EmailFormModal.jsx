import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

function EmailFormModal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Fechar modal"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

EmailFormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default EmailFormModal;