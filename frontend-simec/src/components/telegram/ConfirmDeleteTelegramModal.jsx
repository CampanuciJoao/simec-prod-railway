import React from 'react';
import PropTypes from 'prop-types';
import { ModalConfirmacao } from '@/components/ui';

function ConfirmDeleteTelegramModal({ isOpen, dest, onClose, onConfirm }) {
  const label = dest?.nome || dest?.chatId || 'este destinatário';
  return (
    <ModalConfirmacao
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Remover destinatário"
      message={`Tem certeza que deseja remover "${label}" da lista de notificações do Telegram?`}
      isDestructive
    />
  );
}

ConfirmDeleteTelegramModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  dest: PropTypes.shape({ id: PropTypes.string, nome: PropTypes.string, chatId: PropTypes.string }),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmDeleteTelegramModal;
