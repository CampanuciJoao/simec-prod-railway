import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
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
      className="no-print"
      title="Ação necessária: confirmar finalização"
      description="O tempo agendado para esta manutenção expirou. Registre o resultado para atualizar o sistema."
    >
      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          backgroundColor: 'var(--color-warning-soft)',
          borderColor: 'var(--color-warning)',
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--color-warning-soft)',
              color: 'var(--color-warning)',
            }}
          >
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </span>

          <div className="min-w-0">
            <p
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Escolha o desfecho operacional
            </p>

            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Informe se o equipamento voltou a operar ou se a manutenção precisa
              continuar.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant={confirmMode === 'OK' ? 'success' : 'secondary'}
            onClick={() => setConfirmMode('OK')}
          >
            <FontAwesomeIcon icon={faCheckCircle} />
            Equipamento operante
          </Button>

          <Button
            type="button"
            variant={confirmMode === 'ERRO' ? 'danger' : 'secondary'}
            onClick={() => setConfirmMode('ERRO')}
          >
            <FontAwesomeIcon icon={faTimesCircle} />
            Continua inoperante
          </Button>
        </div>

        {confirmMode === 'OK' ? (
          <div className="mt-5 max-w-md">
            <Input
              label="Data e hora real da conclusão"
              type="datetime-local"
              value={dataTerminoReal}
              onChange={(e) => setDataTerminoReal(e.target.value)}
            />
          </div>
        ) : null}

        {confirmMode === 'ERRO' ? (
          <div className="mt-5 flex max-w-2xl flex-col gap-4">
            <Textarea
              label="Motivo da permanência da falha"
              rows={3}
              placeholder="Descreva o que houve..."
              value={observacaoDecisao}
              onChange={(e) => setObservacaoDecisao(e.target.value)}
            />

            <div className="max-w-md">
              <Input
                label="Nova previsão de conclusão"
                type="datetime-local"
                value={novaPrevisao}
                onChange={(e) => setNovaPrevisao(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {confirmMode ? (
          <div className="mt-5">
            <Button type="button" onClick={onConfirm} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar e atualizar sistema'}
            </Button>
          </div>
        ) : null}
      </div>
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