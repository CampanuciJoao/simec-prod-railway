// src/components/ModalConfirmacaoManutencao.jsx

import React, { useState } from 'react';
import ModalConfirmacao from './ModalConfirmacao';

function ModalConfirmacaoManutencao({
  isOpen,
  onClose,
  onConfirm,
  manutencao
}) {
  const [statusFinal, setStatusFinal] = useState('OPERANTE');
  const [dataFimReal, setDataFimReal] = useState('');

  if (!manutencao) return null;

  const handleConfirm = () => {
    onConfirm({
      statusFinal,
      dataFimReal
    });
  };

  return (
    <ModalConfirmacao
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={`Confirmar conclusão da OS ${manutencao.numeroOS}`}
      confirmText="Confirmar conclusão"
      cancelText="Cancelar"
    >
      <div style={{ marginTop: '10px' }}>

        <p><strong>Equipamento:</strong> {manutencao.equipamento?.modelo}</p>
        <p><strong>Unidade:</strong> {manutencao.equipamento?.unidade?.nomeSistema}</p>

        <hr />

        <label>Horário real de término:</label>
        <input
          type="datetime-local"
          value={dataFimReal}
          onChange={(e) => setDataFimReal(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />

        <label>Status do equipamento após manutenção:</label>
        <select
          value={statusFinal}
          onChange={(e) => setStatusFinal(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="OPERANTE">Operante</option>
          <option value="INOPERANTE">Permanece parado</option>
          <option value="USO_LIMITADO">Uso limitado</option>
        </select>

      </div>
    </ModalConfirmacao>
  );
}

export default ModalConfirmacaoManutencao;