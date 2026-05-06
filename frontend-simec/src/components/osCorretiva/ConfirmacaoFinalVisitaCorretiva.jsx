import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faClockRotateLeft,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Input, PageSection, Textarea } from '@/components/ui';

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

function ConfirmacaoFinalVisitaCorretiva({ visita, onConfirm, submitting, fieldErrors }) {
  const [modo, setModo] = useState(null);
  const [dataHoraFimReal, setDataHoraFimReal] = useState('');
  const [novaDataHoraInicioPrevista, setNovaDataHoraInicioPrevista] = useState('');
  const [novaDataHoraFimPrevista, setNovaDataHoraFimPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const canConfirm =
    modo === 'operante'
      ? !!dataHoraFimReal
      : modo === 'estender'
      ? !!(novaDataHoraInicioPrevista && novaDataHoraFimPrevista)
      : false;

  function handleConfirm() {
    if (!modo) return;
    const payload = { observacoes: observacoes || undefined };
    if (modo === 'operante') {
      payload.resultado = 'Operante';
      payload.dataHoraFimReal = new Date(dataHoraFimReal).toISOString();
    } else {
      payload.resultado = 'PrazoEstendido';
      payload.novaDataHoraInicioPrevista = new Date(novaDataHoraInicioPrevista).toISOString();
      payload.novaDataHoraFimPrevista = new Date(novaDataHoraFimPrevista).toISOString();
    }
    onConfirm(payload);
  }

  return (
    <PageSection
      title="Confirmacao final da visita"
      description="Informe o resultado da visita do prestador e o estado final do equipamento."
    >
      <div
        className="flex items-start gap-3 rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--color-warning-soft)',
          borderColor: 'var(--color-warning)',
        }}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-warning-soft)',
            color: 'var(--color-warning)',
          }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Prazo da visita encerrou
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {visita?.prestadorNome ? `Prestador: ${visita.prestadorNome}. ` : ''}
            Registre o resultado da visita de manutencao.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Como o equipamento ficou?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={modo === 'operante' ? 'success' : 'secondary'}
              onClick={() => setModo('operante')}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              Ficou operante
            </Button>
            <Button
              type="button"
              variant={modo === 'estender' ? 'primary' : 'secondary'}
              onClick={() => setModo('estender')}
            >
              <FontAwesomeIcon icon={faClockRotateLeft} />
              Continua inoperante — estender prazo
            </Button>
          </div>
        </div>

        {modo === 'operante' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Que horas finalizou? *"
                type="datetime-local"
                value={dataHoraFimReal}
                onChange={(e) => setDataHoraFimReal(e.target.value)}
              />
              <FieldError error={fieldErrors?.dataHoraFimReal} />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Observacoes finais"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva o que foi feito, pecas trocadas, pendencias..."
              />
            </div>
          </div>
        )}

        {modo === 'estender' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Nova previsao de inicio *"
                type="datetime-local"
                value={novaDataHoraInicioPrevista}
                onChange={(e) => setNovaDataHoraInicioPrevista(e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraInicioPrevista} />
            </div>
            <div>
              <Input
                label="Nova previsao de termino *"
                type="datetime-local"
                value={novaDataHoraFimPrevista}
                onChange={(e) => setNovaDataHoraFimPrevista(e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraFimPrevista} />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Motivo da extensao"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Explique por que o equipamento continua inoperante e o que sera feito."
              />
            </div>
          </div>
        )}

        {modo && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !canConfirm}
            >
              {submitting ? 'Salvando...' : 'Confirmar e atualizar sistema'}
            </Button>
          </div>
        )}
      </div>
    </PageSection>
  );
}

ConfirmacaoFinalVisitaCorretiva.propTypes = {
  visita: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

ConfirmacaoFinalVisitaCorretiva.defaultProps = {
  visita: null,
  submitting: false,
  fieldErrors: {},
};

export default ConfirmacaoFinalVisitaCorretiva;
