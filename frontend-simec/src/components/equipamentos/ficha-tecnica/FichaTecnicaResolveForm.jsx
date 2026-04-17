import React from 'react';
import PropTypes from 'prop-types';

import {
  Card,
  FormActions,
  Input,
  Textarea,
} from '@/components/ui';

function FichaTecnicaResolveForm({
  payload,
  submitting,
  onChange,
  onCancel,
  onConfirm,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <Card surface="soft" className="rounded-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Solução"
          rows={4}
          value={payload?.solucao || ''}
          onChange={(e) => onChange('solucao', e.target.value)}
          placeholder="Descreva a solução aplicada..."
        />

        <Input
          label="Técnico de resolução"
          value={payload?.tecnicoResolucao || ''}
          onChange={(e) => onChange('tecnicoResolucao', e.target.value)}
          placeholder="Nome do técnico"
        />

        <FormActions
          onCancel={onCancel}
          loading={submitting}
          cancelLabel="Cancelar"
          submitLabel="Confirmar resolução"
        />
      </form>
    </Card>
  );
}

FichaTecnicaResolveForm.propTypes = {
  payload: PropTypes.object,
  submitting: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default FichaTecnicaResolveForm;