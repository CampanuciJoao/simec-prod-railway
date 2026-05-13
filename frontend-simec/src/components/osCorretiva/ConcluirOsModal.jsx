import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Input, Textarea } from '@/components/ui';

function ConcluirOsModal({ isOpen, onClose, onConfirm, submitting }) {
  const [observacoesFinais, setObservacoesFinais] = useState('');
  const [dataHoraConclusao, setDataHoraConclusao] = useState('');

  function handleClose() {
    setObservacoesFinais('');
    setDataHoraConclusao('');
    onClose();
  }

  async function handleConfirm() {
    const payload = { observacoesFinais: observacoesFinais || undefined };
    if (dataHoraConclusao) {
      payload.dataHoraConclusao = new Date(dataHoraConclusao).toISOString();
    }
    await onConfirm(payload);
    setObservacoesFinais('');
    setDataHoraConclusao('');
  }

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Concluir OS Corretiva"
      subtitle="Resolução interna — o equipamento retornará a Operante"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="success" onClick={handleConfirm} disabled={submitting}>
            <FontAwesomeIcon icon={faCheckCircle} />
            {submitting ? 'Concluindo...' : 'Concluir OS'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{ backgroundColor: '#16a34a18', border: '1px solid #16a34a40' }}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="mt-0.5 shrink-0 text-green-700" />
          <div>
            <p className="text-sm font-semibold text-green-800">Ação irreversível</p>
            <p className="text-xs text-green-700 mt-0.5">
              Ao concluir, o status do equipamento será automaticamente atualizado para <strong>Operante</strong>.
            </p>
          </div>
        </div>

        <Input
          label="Hora da conclusão"
          type="datetime-local"
          value={dataHoraConclusao}
          onChange={(e) => setDataHoraConclusao(e.target.value)}
        />
        <p className="-mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Quando o problema foi efetivamente resolvido. Deixe vazio para usar a hora atual.
        </p>

        <Textarea
          label="Observações finais"
          value={observacoesFinais}
          onChange={(e) => setObservacoesFinais(e.target.value)}
          placeholder="Descreva o que foi feito para resolver o problema (opcional)..."
          rows={5}
        />
      </div>
    </Drawer>
  );
}

ConcluirOsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

ConcluirOsModal.defaultProps = { submitting: false };

export default ConcluirOsModal;
