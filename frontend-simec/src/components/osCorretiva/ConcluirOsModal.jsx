import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Input, Textarea } from '@/components/ui';

// Converte input datetime-local (wall-clock na timezone do tenant) em ISO
// UTC. Mesma lógica usada no EditarNotaModal — extraída aqui para evitar
// drift entre componentes; quando aparecer um terceiro consumidor, mover
// para utils/timeUtils.
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

function ConcluirOsModal({ isOpen, onClose, onConfirm, submitting, timezone }) {
  const [observacoesFinais, setObservacoesFinais] = useState('');
  const [dataHoraFimLocal, setDataHoraFimLocal] = useState('');

  function handleClose() {
    setObservacoesFinais('');
    setDataHoraFimLocal('');
    onClose();
  }

  async function handleConfirm() {
    const payload = { observacoesFinais: observacoesFinais || undefined };
    if (dataHoraFimLocal) {
      const iso = inputLocalParaIso(dataHoraFimLocal, timezone);
      if (iso) payload.dataHoraFimEvento = iso;
    }
    await onConfirm(payload);
    setObservacoesFinais('');
    setDataHoraFimLocal('');
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
          label="Hora real da conclusão (opcional)"
          type="datetime-local"
          value={dataHoraFimLocal}
          onChange={(e) => setDataHoraFimLocal(e.target.value)}
          leadingIcon={<FontAwesomeIcon icon={faClock} />}
        />
        <p className="-mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Quando o problema foi efetivamente resolvido. Útil para registro retroativo, quando a OS é fechada no sistema depois do reparo. Deixe vazio para usar a hora atual.
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
  timezone: PropTypes.string,
};

ConcluirOsModal.defaultProps = { submitting: false, timezone: null };

export default ConcluirOsModal;
