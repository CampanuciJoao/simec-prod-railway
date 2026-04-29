import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Textarea } from '@/components/ui';

function AdicionarNotaModal({ isOpen, onClose, onConfirm, submitting, fieldErrors }) {
  const [nota, setNota] = useState('');

  function handleClose() {
    setNota('');
    onClose();
  }

  async function handleSubmit() {
    if (!nota.trim()) return;
    await onConfirm({ nota });
    setNota('');
  }

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Registrar andamento"
      subtitle="Registre uma ação realizada ou observação relevante na OS"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting || !nota.trim()}>
            <FontAwesomeIcon icon={faClipboardList} />
            {submitting ? 'Salvando...' : 'Registrar andamento'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Textarea
          label="Descrição do andamento *"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Descreva a ação realizada, o status atual ou qualquer observação relevante..."
          rows={8}
          maxLength={2000}
        />
        {fieldErrors?.nota && (
          <p className="text-xs text-red-500">{fieldErrors.nota}</p>
        )}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Notas são imutáveis após salvas — fazem parte do histórico de auditoria da OS.
        </p>
      </div>
    </Drawer>
  );
}

AdicionarNotaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

AdicionarNotaModal.defaultProps = { submitting: false, fieldErrors: {} };

export default AdicionarNotaModal;
