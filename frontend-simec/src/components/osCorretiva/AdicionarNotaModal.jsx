import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote } from '@fortawesome/free-solid-svg-icons';
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
      title="Adicionar nota de andamento"
      subtitle="Registre uma ação realizada ou observação relevante"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting || !nota.trim()}>
            <FontAwesomeIcon icon={faStickyNote} />
            {submitting ? 'Salvando...' : 'Salvar nota'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Textarea
          label="Texto da nota *"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Descreva a ação realizada ou observação relevante..."
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
