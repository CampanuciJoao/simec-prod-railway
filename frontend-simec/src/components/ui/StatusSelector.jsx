// Ficheiro: src/components/equipamentos/StatusSelector.jsx
// VERSÃO FINAL - RECEBE onSuccessUpdate CORRETAMENTE

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../contexts/ToastContext';
import { updateEquipamento } from '../../services/api';

const formatarStatusParaDisplay = (status) => {
  if (!status) return '';
  return status.replace(/([A-Z])/g, ' $1').trim();
};

function StatusSelector({ equipamento, onSuccessUpdate }) {
  const [currentStatus, setCurrentStatus] = useState(equipamento.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const { addToast } = useToast();

  const statusOptions = ['Operante', 'Inoperante', 'UsoLimitado', 'EmManutencao'];

  const handleSelectChange = async (e) => {
    const novoStatus = e.target.value;
    setIsUpdating(true);

    try {
      await updateEquipamento(equipamento.id, { status: novoStatus });
      setCurrentStatus(novoStatus);

      if (typeof onSuccessUpdate === 'function') {
        onSuccessUpdate(equipamento.id, novoStatus);
      }

      addToast(`Status de "${equipamento.modelo}" atualizado!`, 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Erro ao atualizar status.', 'error');
      e.target.value = currentStatus;
    } finally {
      setIsUpdating(false);
    }
  };

  const selectClassName = `status-select status-select-${(currentStatus || 'default')
    .toLowerCase()
    .replace(/ /g, '-')}`;

  return (
    <div className="status-selector-wrapper">
      {isUpdating && (
        <FontAwesomeIcon icon={faSpinner} spin className="status-spinner" />
      )}

      <select
        value={currentStatus}
        onChange={handleSelectChange}
        onClick={(e) => e.stopPropagation()}
        className={selectClassName}
        disabled={isUpdating}
        style={{ opacity: isUpdating ? 0.5 : 1 }}
      >
        {statusOptions.map((statusValue) => (
          <option key={statusValue} value={statusValue}>
            {formatarStatusParaDisplay(statusValue)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default StatusSelector;