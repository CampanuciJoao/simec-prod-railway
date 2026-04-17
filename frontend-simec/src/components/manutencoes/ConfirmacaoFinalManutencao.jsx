import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faTriangleExclamation,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Input,
  PageSection,
  Textarea,
} from '@/components/ui';

function ConfirmacaoFinalManutencao({
  visible,
  confirmMode,
  setConfirmMode,
  dataTerminoReal,
  setDataTerminoReal,
  novaPrevisao,
  setNovaPrevisao,
  observacaoDecisao,
  setObservacaoDecisao,
  onConfirm,
  submitting,
}) {
  if (!visible) return null;

  return (
    <PageSection
      title="Confirmar finalização da manutenção"
      description="Registre o desfecho operacional da OS para manter o sistema atualizado."
    >
      <div
        className="flex items-start gap-3 rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--color-warning-soft)',
          borderColor: 'var(--color-warning)',
        }}
      >
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-warning-soft)',
            color: 'var(--color-warning)',
          }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>

        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Escolha o desfecho operacional
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Você pode concluir, prorrogar ou cancelar a manutenção.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={confirmMode === 'concluir' ? 'success' : 'secondary'}
          onClick={() => setConfirmMode('concluir')}
        >
          <FontAwesomeIcon icon={faCheckCircle} />
          Equipamento operante
        </Button>

        <Button
          variant={confirmMode === 'prorrogar' ? 'primary' : 'secondary'}
          onClick={() => setConfirmMode('prorrogar')}
        >
          <FontAwesomeIcon icon={faClockRotateLeft} />
          Continua inoperante
        </Button>

        <Button
          variant={confirmMode === 'cancelar' ? 'danger' : 'secondary'}
          onClick={() => setConfirmMode('cancelar')}
        >
          <FontAwesomeIcon icon={faTimesCircle} />
          Cancelar OS
        </Button>
      </div>

      {confirmMode === 'concluir' && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Data e hora da conclusão"
            type="datetime-local"
            value={dataTerminoReal}
            onChange={(e) => setDataTerminoReal(e.target.value)}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Observação final"
              rows={3}
              value={observacaoDecisao}
              onChange={(e) => setObservacaoDecisao(e.target.value)}
              placeholder="Ex.: Equipamento liberado para operação."
            />
          </div>
        </div>
      )}

      {confirmMode === 'prorrogar' && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nova previsão"
            type="datetime-local"
            value={novaPrevisao}
            onChange={(e) => setNovaPrevisao(e.target.value)}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Motivo"
              rows={3}
              value={observacaoDecisao}
              onChange={(e) => setObservacaoDecisao(e.target.value)}
              placeholder="Descreva o motivo da prorrogação."
            />
          </div>
        </div>
      )}

      {confirmMode === 'cancelar' && (
        <div className="mt-6">
          <Textarea
            label="Motivo do cancelamento"
            rows={3}
            value={observacaoDecisao}
            onChange={(e) => setObservacaoDecisao(e.target.value)}
            placeholder="Descreva o motivo do cancelamento."
          />
        </div>
      )}

      {confirmMode && (
        <div className="mt-6 flex justify-end">
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Confirmar e atualizar sistema'}
          </Button>
        </div>
      )}
    </PageSection>
  );
}

ConfirmacaoFinalManutencao.propTypes = {
  visible: PropTypes.bool,
  confirmMode: PropTypes.string,
  setConfirmMode: PropTypes.func.isRequired,
  dataTerminoReal: PropTypes.string,
  setDataTerminoReal: PropTypes.func.isRequired,
  novaPrevisao: PropTypes.string,
  setNovaPrevisao: PropTypes.func.isRequired,
  observacaoDecisao: PropTypes.string,
  setObservacaoDecisao: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default ConfirmacaoFinalManutencao;