import React from 'react';
import PropTypes from 'prop-types';

import ModalConfirmacao from '@/components/ui/feedback/ModalConfirmacao';

function ConfirmDeleteEmailModal({ isOpen, email, onClose, onConfirm }) {
  return (
    <ModalConfirmacao
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Remover e-mail"
      message={`Tem certeza que deseja remover o e-mail "${email?.email || ''}" da lista de notificações?`}
      isDestructive
    />
  );
}

ConfirmDeleteEmailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  email: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    email: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmDeleteEmailModal;