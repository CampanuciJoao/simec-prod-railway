import React from 'react';
import PropTypes from 'prop-types';

import Button from '@/components/ui/primitives/Button';

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function TextareaInput(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function FichaTecnicaResolveForm({
  payload,
  submitting,
  onChange,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <FormField label="Solução">
          <TextareaInput
            rows={4}
            value={payload.solucao || ''}
            onChange={(e) => onChange('solucao', e.target.value)}
            placeholder="Descreva a solução aplicada..."
          />
        </FormField>

        <FormField label="Técnico de resolução">
          <TextInput
            value={payload.tecnicoResolucao || ''}
            onChange={(e) => onChange('tecnicoResolucao', e.target.value)}
            placeholder="Nome do técnico"
          />
        </FormField>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            Confirmar resolução
          </Button>
        </div>
      </div>
    </div>
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