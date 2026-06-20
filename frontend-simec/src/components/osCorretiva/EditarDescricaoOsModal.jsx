import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Textarea } from '@/components/ui';

function EditarDescricaoOsModal({
  isOpen,
  descricaoOriginal,
  onClose,
  onConfirm,
  submitting,
  fieldErrors,
}) {
  const [descricao, setDescricao] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDescricao(descricaoOriginal || '');
      setMotivo('');
    }
  }, [isOpen, descricaoOriginal]);

  const descricaoTrim = descricao.trim();
  const motivoTrim = motivo.trim();
  const houveMudanca = descricaoTrim && descricaoTrim !== (descricaoOriginal || '').trim();
  const podeSalvar = houveMudanca && motivoTrim.length >= 3;

  async function handleSubmit() {
    if (!podeSalvar) return;
    await onConfirm({
      descricaoProblema: descricaoTrim,
      motivo: motivoTrim,
    });
  }

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title="Editar descrição da OS"
      subtitle="Corrija o texto do problema. Antes/depois e motivo ficam no log de auditoria."
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !podeSalvar}
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Textarea
          label="Descrição do problema *"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={6}
          maxLength={2000}
        />
        {fieldErrors?.descricaoProblema && (
          <p className="text-xs text-red-500">{fieldErrors.descricaoProblema}</p>
        )}

        <Textarea
          label="Motivo da edição *"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder='Ex.: "Correção de typo na descrição do problema."'
        />
        {fieldErrors?.motivo && (
          <p className="text-xs text-red-500">{fieldErrors.motivo}</p>
        )}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Toda edição mantém o texto anterior e o motivo no log de auditoria. Esta ação é permitida inclusive em OS concluída ou cancelada.
        </p>
      </div>
    </Drawer>
  );
}

EditarDescricaoOsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  descricaoOriginal: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

EditarDescricaoOsModal.defaultProps = {
  descricaoOriginal: '',
  submitting: false,
  fieldErrors: {},
};

export default EditarDescricaoOsModal;
