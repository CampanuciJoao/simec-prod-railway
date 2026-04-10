// src/components/ui/Toast.jsx
// VERSÃO ATUALIZADA - COM LÓGICA DE AUTO-FECHAMENTO

import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faInfoCircle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

const toastConfig = {
  success: { icon: faCheckCircle, className: 'toast-success' },
  error: { icon: faTimesCircle, className: 'toast-error' },
  info: { icon: faInfoCircle, className: 'toast-info' },
};

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const config = toastConfig[type] || toastConfig.info;

  return (
    <div className={`toast ${config.className}`}>
      <FontAwesomeIcon icon={config.icon} className="toast-icon" />
      <span className="toast-message">{message}</span>
      <button type="button" onClick={onClose} className="toast-close-btn">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
}

export default Toast;