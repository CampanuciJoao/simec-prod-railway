import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faClockRotateLeft,
  faTimesCircle,
  faTriangleExclamation,
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
  manutencaoRealizada,
  setManutencaoRealizada,
  dataTerminoReal,
  setDataTerminoReal,
  novaPrevisao,
  setNovaPrevisao,
  observacaoDecisao,
  setObservacaoDecisao,
  onConfirm,
  canConfirm,
  submitting,
}) {
  if (!visible) return null;

  const motivoLabel =
    manutencaoRealizada === false
      ? 'Por que a manutencao nao ocorreu?'
      : 'Justificativa operacional';

  return (
    <PageSection
      title="Confirmacao final da manutencao"
      description="Confirme o desfecho real da OS e o estado final do equipamento."
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
            O prazo da OS terminou
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Informe se ela foi executada e como o equipamento ficou depois disso.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Como o equipamento ficou?
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={confirmMode === 'concluir' ? 'success' : 'secondary'}
              onClick={() => setConfirmMode('concluir')}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              Ficou operante
            </Button>

            <Button
              type="button"
              variant={confirmMode === 'prorrogar' ? 'primary' : 'secondary'}
              onClick={() => setConfirmMode('prorrogar')}
            >
              <FontAwesomeIcon icon={faClockRotateLeft} />
              Continua inoperante
            </Button>

            <Button
              type="button"
              variant={confirmMode === 'cancelar' ? 'danger' : 'secondary'}
              onClick={() => setConfirmMode('cancelar')}
            >
              <FontAwesomeIcon icon={faTimesCircle} />
              Cancelar OS
            </Button>
          </div>
        </div>

        {confirmMode === 'concluir' || confirmMode === 'prorrogar' ? (
          <div>
            <p
              className="mb-2 text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              A manutencao ocorreu mesmo?
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={
                  manutencaoRealizada === true ? 'primary' : 'secondary'
                }
                onClick={() => setManutencaoRealizada(true)}
              >
                Sim, ocorreu
              </Button>

              <Button
                type="button"
                variant={
                  manutencaoRealizada === false ? 'danger' : 'secondary'
                }
                onClick={() => setManutencaoRealizada(false)}
              >
                Nao ocorreu
              </Button>
            </div>
          </div>
        ) : null}

        {confirmMode === 'concluir' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Que horas finalizou?"
              type="datetime-local"
              value={dataTerminoReal}
              onChange={(event) => setDataTerminoReal(event.target.value)}
            />

            <div className="md:col-span-2">
              <Textarea
                label={motivoLabel}
                rows={3}
                value={observacaoDecisao}
                onChange={(event) => setObservacaoDecisao(event.target.value)}
                placeholder={
                  manutencaoRealizada === false
                    ? 'Explique por que a manutencao nao aconteceu.'
                    : 'Observacoes finais da execucao.'
                }
              />
            </div>
          </div>
        ) : null}

        {confirmMode === 'prorrogar' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nova previsao de termino"
              type="datetime-local"
              value={novaPrevisao}
              onChange={(event) => setNovaPrevisao(event.target.value)}
            />

            <div className="md:col-span-2">
              <Textarea
                label={motivoLabel}
                rows={3}
                value={observacaoDecisao}
                onChange={(event) => setObservacaoDecisao(event.target.value)}
                placeholder={
                  manutencaoRealizada === false
                    ? 'Explique por que a manutencao nao aconteceu e o que sera feito.'
                    : 'Explique por que o equipamento continua inoperante.'
                }
              />
            </div>
          </div>
        ) : null}

        {confirmMode === 'cancelar' ? (
          <div className="max-w-2xl">
            <Textarea
              label="Justificativa do cancelamento"
              rows={3}
              value={observacaoDecisao}
              onChange={(event) => setObservacaoDecisao(event.target.value)}
              placeholder="Explique por que a OS esta sendo cancelada."
            />
          </div>
        ) : null}

        {confirmMode && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onConfirm}
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

ConfirmacaoFinalManutencao.propTypes = {
  visible: PropTypes.bool,
  confirmMode: PropTypes.string,
  setConfirmMode: PropTypes.func.isRequired,
  manutencaoRealizada: PropTypes.bool,
  setManutencaoRealizada: PropTypes.func.isRequired,
  dataTerminoReal: PropTypes.string,
  setDataTerminoReal: PropTypes.func.isRequired,
  novaPrevisao: PropTypes.string,
  setNovaPrevisao: PropTypes.func.isRequired,
  observacaoDecisao: PropTypes.string,
  setObservacaoDecisao: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  canConfirm: PropTypes.bool,
  submitting: PropTypes.bool,
};

export default ConfirmacaoFinalManutencao;
