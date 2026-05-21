import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faClock } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Input, Textarea } from '@/components/ui';

// Converte ISO + timezone em valor de input datetime-local (YYYY-MM-DDTHH:mm)
// na visão do usuário do tenant. Usa Intl.DateTimeFormat para extrair as
// partes na timezone correta — evita drift de UTC vs local.
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
    // sv-SE devolve "YYYY-MM-DD HH:mm" — só trocar espaço por 'T'.
    return fmt.format(d).replace(' ', 'T');
  } catch {
    return '';
  }
}

// Converte input datetime-local (interpretado como wall-clock na timezone
// do tenant) em ISO UTC pra mandar pro backend.
function inputLocalParaIso(valor, timezone) {
  if (!valor) return null;
  try {
    // Constrói ISO assumindo que valor é wall-clock na timezone do tenant.
    // Como o input não carrega offset, montamos com offset 0 e ajustamos
    // pegando a diferença entre o que aquela data renderiza na timezone
    // alvo vs em UTC.
    const [datePart, timePart] = valor.split('T');
    const [Y, M, D] = datePart.split('-').map(Number);
    const [h, m] = timePart.split(':').map(Number);

    // Usa Date.UTC pra obter um ponto fixo, depois ajusta pelo offset da TZ.
    const utcEpoch = Date.UTC(Y, M - 1, D, h, m);
    // Calcula offset da timezone naquele instante.
    const tz = timezone || 'UTC';
    const tzFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
      timeZoneName: 'shortOffset',
    });
    const parts = tzFmt.formatToParts(new Date(utcEpoch));
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    // offsetPart: "GMT-4" ou "GMT-03:30" etc.
    const match = offsetPart.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
    let offsetMinutes = 0;
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hh = Number(match[2] || 0);
      const mm = Number(match[3] || 0);
      offsetMinutes = sign * (hh * 60 + mm);
    }
    // ISO final: utcEpoch interpretado como local na TZ; subtrai offset
    // pra converter pra UTC real.
    const realUtc = new Date(utcEpoch - offsetMinutes * 60 * 1000);
    return realUtc.toISOString();
  } catch {
    return null;
  }
}

function EditarNotaModal({
  isOpen,
  evento,
  timezone,
  onClose,
  onConfirm,
  submitting,
  fieldErrors,
}) {
  const [nota, setNota] = useState('');
  const [dataLocal, setDataLocal] = useState('');

  const originais = useMemo(
    () => ({
      nota: evento?.descricao || '',
      dataLocal: isoParaInputLocal(evento?.dataHora, timezone),
    }),
    [evento, timezone]
  );

  useEffect(() => {
    if (isOpen && evento) {
      setNota(originais.nota);
      setDataLocal(originais.dataLocal);
    }
  }, [isOpen, evento, originais]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    const payload = {};
    if (nota.trim() && nota !== originais.nota) payload.nota = nota.trim();
    if (dataLocal && dataLocal !== originais.dataLocal) {
      payload.data = inputLocalParaIso(dataLocal, timezone);
      if (!payload.data) return;
    }
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    await onConfirm(payload);
  }

  const houveMudanca =
    (nota.trim() && nota !== originais.nota) ||
    (dataLocal && dataLocal !== originais.dataLocal);

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Editar nota de andamento"
      subtitle="Ajuste texto ou hora da nota. A alteração fica registrada na auditoria."
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !houveMudanca}
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Textarea
          label="Texto da nota *"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={8}
          maxLength={2000}
        />
        {fieldErrors?.nota && (
          <p className="text-xs text-red-500">{fieldErrors.nota}</p>
        )}

        <Input
          label="Data e hora"
          type="datetime-local"
          value={dataLocal}
          onChange={(e) => setDataLocal(e.target.value)}
          leadingIcon={<FontAwesomeIcon icon={faClock} />}
        />
        {fieldErrors?.data && (
          <p className="text-xs text-red-500">{fieldErrors.data}</p>
        )}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Útil para corrigir registros retroativos que ficaram fora de ordem cronológica com os demais eventos da OS. Toda edição é registrada no log de auditoria.
        </p>
      </div>
    </Drawer>
  );
}

EditarNotaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  evento: PropTypes.object,
  timezone: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

EditarNotaModal.defaultProps = {
  evento: null,
  timezone: null,
  submitting: false,
  fieldErrors: {},
};

export default EditarNotaModal;
