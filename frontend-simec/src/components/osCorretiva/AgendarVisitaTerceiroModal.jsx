import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button } from '@/components/ui';

const INIT = {
  prestadorNome: '',
  dataHoraInicioPrevista: '',
  dataHoraFimPrevista: '',
};

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

function AgendarVisitaTerceiroModal({ isOpen, onClose, onConfirm, submitting, fieldErrors }) {
  const [form, setForm] = useState(INIT);

  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleClose() {
    setForm(INIT);
    onClose();
  }

  async function handleSubmit() {
    if (!form.prestadorNome.trim() || !form.dataHoraInicioPrevista || !form.dataHoraFimPrevista) return;
    await onConfirm({
      prestadorNome: form.prestadorNome,
      dataHoraInicioPrevista: new Date(form.dataHoraInicioPrevista).toISOString(),
      dataHoraFimPrevista: new Date(form.dataHoraFimPrevista).toISOString(),
    });
    setForm(INIT);
  }

  const canSubmit = form.prestadorNome.trim() && form.dataHoraInicioPrevista && form.dataHoraFimPrevista;

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Agendar visita de terceiro"
      subtitle="Informe o prestador e a previsão de atendimento"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            <FontAwesomeIcon icon={faTruck} />
            {submitting ? 'Agendando...' : 'Agendar visita'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Prestador / Empresa *
          </label>
          <input
            type="text"
            className="input w-full"
            placeholder="Nome ou razão social do prestador"
            value={form.prestadorNome}
            onChange={(e) => handleChange('prestadorNome', e.target.value)}
            maxLength={200}
          />
          <FieldError error={fieldErrors?.prestadorNome} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Previsão de início *
          </label>
          <input
            type="datetime-local"
            className="input w-full"
            value={form.dataHoraInicioPrevista}
            onChange={(e) => handleChange('dataHoraInicioPrevista', e.target.value)}
          />
          <FieldError error={fieldErrors?.dataHoraInicioPrevista} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Previsão de término *
          </label>
          <input
            type="datetime-local"
            className="input w-full"
            value={form.dataHoraFimPrevista}
            onChange={(e) => handleChange('dataHoraFimPrevista', e.target.value)}
          />
          <FieldError error={fieldErrors?.dataHoraFimPrevista} />
        </div>
      </div>
    </Drawer>
  );
}

AgendarVisitaTerceiroModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

AgendarVisitaTerceiroModal.defaultProps = { submitting: false, fieldErrors: {} };

export default AgendarVisitaTerceiroModal;
