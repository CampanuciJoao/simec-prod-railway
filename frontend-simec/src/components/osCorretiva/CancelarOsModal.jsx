import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Textarea } from '@/components/ui';

function CancelarOsModal({ isOpen, onClose, onConfirm, submitting }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');

  function handleClose() {
    setMotivo('');
    setErro('');
    onClose();
  }

  async function handleConfirm() {
    if (!motivo.trim()) {
      setErro('O motivo do cancelamento é obrigatório.');
      return;
    }
    setErro('');
    await onConfirm(motivo.trim());
    setMotivo('');
  }

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Cancelar OS Corretiva"
      subtitle="O motivo ficará registrado no histórico da OS"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Voltar
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={submitting}>
            <FontAwesomeIcon icon={faBan} />
            {submitting ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{ backgroundColor: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-border, #fca5a5)' }}
        >
          <FontAwesomeIcon icon={faBan} className="mt-0.5 shrink-0" style={{ color: 'var(--color-danger)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>Ação irreversível</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
              Ao cancelar, o status do equipamento será revertido para <strong>Operante</strong> e a OS não poderá ser reaberta.
            </p>
          </div>
        </div>

        <Textarea
          label="Motivo do cancelamento"
          value={motivo}
          onChange={(e) => { setMotivo(e.target.value); setErro(''); }}
          placeholder="Descreva o motivo pelo qual esta OS está sendo cancelada..."
          rows={5}
          error={erro}
          required
        />
      </div>
    </Drawer>
  );
}

CancelarOsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

CancelarOsModal.defaultProps = { submitting: false };

export default CancelarOsModal;
