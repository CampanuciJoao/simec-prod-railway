import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Textarea } from '@/components/ui';

const INIT = {
  resultado: '',
  observacoes: '',
  novaDataHoraInicioPrevista: '',
  novaDataHoraFimPrevista: '',
};

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

function RegistrarResultadoVisitaModal({ isOpen, onClose, onConfirm, submitting, fieldErrors, visita }) {
  const [form, setForm] = useState(INIT);

  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleClose() {
    setForm(INIT);
    onClose();
  }

  async function handleSubmit() {
    if (!form.resultado) return;
    const payload = {
      resultado: form.resultado,
      observacoes: form.observacoes || undefined,
    };
    if (form.resultado === 'PrazoEstendido') {
      payload.novaDataHoraInicioPrevista = new Date(form.novaDataHoraInicioPrevista).toISOString();
      payload.novaDataHoraFimPrevista = new Date(form.novaDataHoraFimPrevista).toISOString();
    }
    await onConfirm(payload);
    setForm(INIT);
  }

  const precisaExtensao = form.resultado === 'PrazoEstendido';
  const canSubmit = form.resultado && (!precisaExtensao || (form.novaDataHoraInicioPrevista && form.novaDataHoraFimPrevista));

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Registrar resultado da visita"
      subtitle="Informe se o equipamento ficou operante ou se o prazo precisa ser estendido"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            <FontAwesomeIcon icon={faClipboardCheck} />
            {submitting ? 'Salvando...' : 'Registrar resultado'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        {visita?.visita && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-soft)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Prestador</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {visita.visita.prestadorNome}
            </p>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Resultado *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'Operante', label: 'Equipamento operante', color: '#16a34a' },
              { value: 'PrazoEstendido', label: 'Estender prazo', color: '#f97316' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="rounded-xl border-2 p-3 text-sm font-semibold transition-colors"
                style={{
                  borderColor: form.resultado === opt.value ? opt.color : 'var(--border-soft)',
                  backgroundColor: form.resultado === opt.value ? `${opt.color}18` : 'transparent',
                  color: form.resultado === opt.value ? opt.color : 'var(--text-secondary)',
                }}
                onClick={() => handleChange('resultado', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <FieldError error={fieldErrors?.resultado} />
        </div>

        {precisaExtensao && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Nova previsão de início *
              </label>
              <input
                type="datetime-local"
                className="input w-full"
                value={form.novaDataHoraInicioPrevista}
                onChange={(e) => handleChange('novaDataHoraInicioPrevista', e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraInicioPrevista} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Nova previsão de término *
              </label>
              <input
                type="datetime-local"
                className="input w-full"
                value={form.novaDataHoraFimPrevista}
                onChange={(e) => handleChange('novaDataHoraFimPrevista', e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraFimPrevista} />
            </div>
          </>
        )}

        <Textarea
          label="Observações"
          value={form.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="Descreva o resultado, peças trocadas, pendências..."
          rows={4}
        />
      </div>
    </Drawer>
  );
}

RegistrarResultadoVisitaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
  visita: PropTypes.object,
};

RegistrarResultadoVisitaModal.defaultProps = { submitting: false, fieldErrors: {}, visita: null };

export default RegistrarResultadoVisitaModal;
