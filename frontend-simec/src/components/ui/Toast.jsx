// src/components/Toast.jsx
// VERSÃO ATUALIZADA - COM LÓGICA DE AUTO-FECHAMENTO

import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

const toastConfig = {
  success: { icon: faCheckCircle, className: 'toast-success' },
  error: { icon: faTimesCircle, className: 'toast-error' },
  info: { icon: faInfoCircle, className: 'toast-info' },
};

function Toast({ message, type, onClose }) {
  // ==============================================================
  // >> ALTERAÇÃO PRINCIPAL APLICADA AQUI <<
  // Este useEffect cria um timer que chama a função onClose após 5 segundos.
  // A função de cleanup (return) limpa o timer se o componente for
  // removido antes (ex: se o usuário clicar no 'X').
  // ==============================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // 5000 milissegundos = 5 segundos

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const config = toastConfig[type] || toastConfig.info;

  return (
    <div className={`toast ${config.className}`}>
      <FontAwesomeIcon icon={config.icon} className="toast-icon" />
      <span className="toast-message">{message}</span>
      <button onClick={onClose} className="toast-close-btn">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
}

export default Toast;