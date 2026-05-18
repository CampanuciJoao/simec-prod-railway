import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

function EmailFormModal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border transition"
            style={{
              borderColor: 'var(--border-soft)',
              color: 'var(--text-muted)',
              backgroundColor: 'transparent',
            }}
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
