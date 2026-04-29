import React from 'react';
import PropTypes from 'prop-types';
import { ModalConfirmacao } from '@/components/ui';

function ModalConfirmacaoOs({ isOpen, onClose, onConfirm, os }) {
  return (
    <ModalConfirmacao
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir OS Corretiva"
      message={
        os
          ? `Deseja excluir a OS ${os.numeroOS}? O status do equipamento será revertido para Operante. Esta ação é irreversível.`
          : 'Deseja excluir esta OS Corretiva?'
      }
      confirmText="Excluir"
      isDestructive
    />
  );
}

ModalConfirmacaoOs.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  os: PropTypes.object,
};

ModalConfirmacaoOs.defaultProps = { os: null };

export default ModalConfirmacaoOs;
