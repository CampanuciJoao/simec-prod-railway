import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button } from '@/components/ui';

// Converte ISO -> valor de input datetime-local na timezone do tenant.
// Mesmo padrao usado em EditarNotaModal — extraido aqui de forma inline
// pra evitar import circular. Quando aparecer um 3o consumidor, mover
// para utils/timeUtils.
function isoParaInputLocal(iso, timezone) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return fmt.format(d).replace(' ', 'T');
  } catch {
    return '';
  }
}

// Converte input datetime-local (wall-clock na timezone do tenant) -> ISO UTC.
function inputLocalParaIso(valor, timezone) {
  if (!valor) return null;
  try {
    const [datePart, timePart] = valor.split('T');
    const [Y, M, D] = datePart.split('-').map(Number);
    const [h, m] = timePart.split(':').map(Number);
    const utcEpoch = Date.UTC(Y, M - 1, D, h, m);
    const tz = timezone || 'UTC';
    const tzFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
      timeZoneName: 'shortOffset',
    });
    const parts = tzFmt.formatToParts(new Date(utcEpoch));
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const match = offsetPart.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
    let offsetMinutes = 0;
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hh = Number(match[2] || 0);
      const mm = Number(match[3] || 0);
      offsetMinutes = sign * (hh * 60 + mm);
    }
    return new Date(utcEpoch - offsetMinutes * 60 * 1000).toISOString();
  } catch {
    return null;
  }
}

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

FieldError.propTypes = { error: PropTypes.string };
FieldError.defaultProps = { error: null };

function ReagendarVisitaModal({ isOpen, visita, timezone, onClose, onConfirm, submitting, fieldErrors }) {
  const [prestadorNome, setPrestadorNome] = useState('');
  const [inicioLocal, setInicioLocal] = useState('');
  const [fimLocal, setFimLocal] = useState('');
  const [motivo, setMotivo] = useState('');

  // Pre-preenche com dados da visita atual quando o modal abre.
  // Prestador fica como placeholder/value sugestivo — admin pode
  // alterar para trocar de empresa.
  useEffect(() => {
    if (isOpen && visita) {
      setPrestadorNome(visita.prestadorNome || '');
      setInicioLocal(isoParaInputLocal(visita.dataHoraInicioPrevista, timezone));
      setFimLocal(isoParaInputLocal(visita.dataHoraFimPrevista, timezone));
      setMotivo('');
    }
  }, [isOpen, visita, timezone]);

  const motivoLen = motivo.trim().length;
  const canSubmit = useMemo(() => (
    inicioLocal && fimLocal && motivoLen >= 3 && motivoLen <= 500
  ), [inicioLocal, fimLocal, motivoLen]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const inicioIso = inputLocalParaIso(inicioLocal, timezone);
    const fimIso    = inputLocalParaIso(fimLocal,    timezone);
    if (!inicioIso || !fimIso) return;

    const payload = {
      dataHoraInicioPrevista: inicioIso,
      dataHoraFimPrevista:    fimIso,
      motivo: motivo.trim(),
    };
    // Prestador eh opcional — so envia se o admin alterou
    const prestadorTrim = prestadorNome.trim();
    if (prestadorTrim && prestadorTrim !== (visita?.prestadorNome || '')) {
      payload.prestadorNome = prestadorTrim;
    }
    await onConfirm(payload);
  }

  if (!visita) return null;

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Reagendar visita"
      subtitle="Mantém a OS aberta. A visita atual é marcada como Reagendada e uma nova é criada."
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            <FontAwesomeIcon icon={faRotate} />
            {submitting ? 'Reagendando...' : 'Confirmar reagendamento'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div
          className="rounded-xl border px-3 py-2 text-xs"
          style={{
            backgroundColor: 'var(--bg-surface-soft)',
            borderColor: 'var(--border-soft)',
            color: 'var(--text-muted)',
          }}
        >
          A visita anterior fica registrada na timeline como{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>Reagendada</strong>{' '}
          (auditoria completa). Esta operação não cancela a OS.
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Prestador / Empresa
          </label>
          <input
            type="text"
            className="input w-full"
            placeholder="Mantenha o mesmo ou informe outro prestador"
            value={prestadorNome}
            onChange={(e) => setPrestadorNome(e.target.value)}
            maxLength={200}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Deixe igual ao atual para manter o mesmo prestador. Altere se trocou de empresa.
          </p>
          <FieldError error={fieldErrors?.prestadorNome} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nova previsão de início *
          </label>
          <input
            type="datetime-local"
            className="input w-full"
            value={inicioLocal}
            onChange={(e) => setInicioLocal(e.target.value)}
          />
          <FieldError error={fieldErrors?.dataHoraInicioPrevista} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nova previsão de término *
          </label>
          <input
            type="datetime-local"
            className="input w-full"
            value={fimLocal}
            onChange={(e) => setFimLocal(e.target.value)}
          />
          <FieldError error={fieldErrors?.dataHoraFimPrevista} />
        </div>

        <div>
          <label className="mb-1.5 flex items-baseline justify-between text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            <span>Motivo do reagendamento *</span>
            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              {motivoLen}/500
            </span>
          </label>
          <textarea
            className="input w-full"
            rows={3}
            maxLength={500}
            placeholder="Ex: Pró Info remarcou por imprevisto na data anterior"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <FieldError error={fieldErrors?.motivo} />
        </div>
      </div>
    </Drawer>
  );
}

ReagendarVisitaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  visita: PropTypes.object,
  timezone: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

ReagendarVisitaModal.defaultProps = {
  visita: null,
  timezone: null,
  submitting: false,
  fieldErrors: {},
};

export default ReagendarVisitaModal;
