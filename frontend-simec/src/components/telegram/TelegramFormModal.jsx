import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

function TelegramFormModal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div
        className="w-full max-w-3xl rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
        }}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-muted)',
            }}
            aria-label="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

TelegramFormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default TelegramFormModal;
