// Ficheiro: src/components/ModalCancelamento.jsx
// VERSÃO FINAL CORRIGIDA

import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { cancelarManutencao } from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function ModalCancelamento({ isOpen, onClose, manutencao, onCancelConfirm }) {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) setMotivo('');
  }, [isOpen]);

  const handleConfirmClick = async () => {
    if (!motivo.trim()) {
      addToast('O motivo do cancelamento é obrigatório.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // ==========================================================================
      // >> CORREÇÃO PRINCIPAL APLICADA AQUI <<
      // Agora enviamos um objeto `{ motivo }`, como o backend espera.
      // ==========================================================================
      await cancelarManutencao(manutencao.id, { motivo });

      addToast(`OS ${manutencao.numeroOS} cancelada com sucesso.`, 'success');
      
      // Chama a função do pai para recarregar os dados e fechar o modal
      if (onCancelConfirm) onCancelConfirm();
      onClose();

    } catch (error) {
      addToast(error.response?.data?.message || 'Falha ao cancelar a manutenção.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !manutencao) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-action" onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <h3>Cancelar Manutenção (OS: {manutencao.numeroOS})</h3>
        <div className="modal-body">
          <p>Você está prestes a cancelar a manutenção para: <strong>{manutencao.equipamento?.modelo}</strong>.</p>
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="motivo-cancelamento">Motivo do Cancelamento *</label>
            <textarea
              id="motivo-cancelamento"
              rows="4"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Voltar
          </button>
          <button className="btn btn-danger" onClick={handleConfirmClick} disabled={isSubmitting || !motivo.trim()}>
            {isSubmitting ? 'Confirmando...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCancelamento;