import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import { Button, Card } from '@/components/ui';

function ModalConfirmacao({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acao',
  message = 'Voce tem certeza?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
  confirmDisabled = false,
  children = null,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.55)' }}
      onClick={onClose}
    >
      <Card
        className="relative w-full max-w-md rounded-2xl p-6"
        surface="default"
        style={{
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl transition"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Fechar modal"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className="pr-10">
          <h3
            className="flex items-center gap-3 text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {isDestructive ? (
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </span>
            ) : null}

            <span>{title}</span>
          </h3>

          <div
            className="mt-4 text-sm leading-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p>{message}</p>
          </div>

          {children ? <div className="mt-4">{children}</div> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}

ModalConfirmacao.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  isDestructive: PropTypes.bool,
  confirmDisabled: PropTypes.bool,
  children: PropTypes.node,
};

export default ModalConfirmacao;
