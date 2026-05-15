import React from 'react';
import PropTypes from 'prop-types';

import { ModalConfirmacao } from '@/components/ui';

// Wrapper sobre o ModalConfirmacao genérico, dedicado à exclusão de
// manutenção. Mantém a API que ManutencoesPage espera (isOpen, onClose,
// onConfirm, manutencao) e constrói a mensagem amigável.
function ModalConfirmacaoManutencao({ isOpen, onClose, onConfirm, manutencao }) {
  const numero = manutencao?.numeroOS || 'desta manutenção';
  const equipamento =
    manutencao?.equipamento?.apelido ||
    manutencao?.equipamento?.modelo ||
    null;

  const mensagem = `Deseja excluir a OS ${numero}${
    equipamento ? ` (${equipamento})` : ''
  }? Esta ação não pode ser desfeita.`;

  return (
    <ModalConfirmacao
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir manutenção"
      message={mensagem}
      confirmText="Excluir"
      isDestructive
    />
  );
}

ModalConfirmacaoManutencao.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  manutencao: PropTypes.object,
};

export default ModalConfirmacaoManutencao;
