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
  statusAtual,
  categoria,
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

  // Rotinas prediais (caixa d'agua, bebedouro, dedetizacao, extintor) nao
  // tem "equipamento operante" — o servico foi feito ou nao foi. Troca
  // vocabulario de ao lado de equipamento (ficou operante/continua inoperante)
  // pra linguagem de servico (realizado/reagendar). Tambem ja implica
  // manutencaoRealizada ao escolher a acao, dispensando sub-pergunta.
  const ehPredial = categoria === 'Predial';

  const prazoVencido = statusAtual === 'AguardandoConfirmacao';
  const tituloBanner = prazoVencido
    ? (ehPredial ? 'O prazo do servico terminou' : 'O prazo da OS terminou')
    : (ehPredial ? 'Registrar execucao do servico' : 'Registrar desfecho da OS');
  const subtituloBanner = prazoVencido
    ? (ehPredial
        ? 'Informe se o servico predial foi executado e quando.'
        : 'Informe se ela foi executada e como o equipamento ficou depois disso.')
    : (ehPredial
        ? 'Registre a execucao (inclusive retroativa), reagende ou cancele a OS.'
        : 'Use esta secao pra concluir, prorrogar ou cancelar a OS — inclusive para registro retroativo (servico ja executado).');

  const perguntaAcao = ehPredial ? 'Qual foi o desfecho do servico?' : 'Como o equipamento ficou?';
  const labelConcluir = ehPredial ? 'Servico realizado' : 'Ficou operante';
  const labelProrrogar = ehPredial ? 'Reagendar (nao executado)' : 'Continua inoperante';
  const labelDataConclusao = ehPredial ? 'Quando o servico foi executado?' : 'Que horas finalizou?';
  const labelNovaPrevisao = ehPredial ? 'Nova data planejada' : 'Nova previsao de termino';

  // Para predial a sub-pergunta "a manutencao ocorreu mesmo?" nao se aplica
  // — concluir implica servico realizado, reagendar implica nao realizado.
  // Auto-seta manutencaoRealizada ao clicar na acao principal, sem botoes
  // adicionais na UI.
  function handleSelectConfirmMode(mode) {
    setConfirmMode(mode);
    if (ehPredial) {
      if (mode === 'concluir') setManutencaoRealizada(true);
      else if (mode === 'prorrogar') setManutencaoRealizada(false);
    }
  }

  const motivoLabel = ehPredial
    ? (confirmMode === 'prorrogar' ? 'Por que nao foi executado?' : 'Observacoes do servico')
    : (manutencaoRealizada === false
        ? 'Por que a manutencao nao ocorreu?'
        : 'Justificativa operacional');

  return (
    <PageSection
      title={
        prazoVencido
          ? (ehPredial ? 'Confirmacao final do servico' : 'Confirmacao final da manutencao')
          : (ehPredial ? 'Finalizar servico / registro retroativo' : 'Finalizar OS / registro retroativo')
      }
      description={
        ehPredial
          ? 'Confirme a execucao real do servico predial.'
          : 'Confirme o desfecho real da OS e o estado final do equipamento.'
      }
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
            {tituloBanner}
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {subtituloBanner}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {perguntaAcao}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={confirmMode === 'concluir' ? 'success' : 'secondary'}
              onClick={() => handleSelectConfirmMode('concluir')}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              {labelConcluir}
            </Button>

            <Button
              type="button"
              variant={confirmMode === 'prorrogar' ? 'primary' : 'secondary'}
              onClick={() => handleSelectConfirmMode('prorrogar')}
            >
              <FontAwesomeIcon icon={faClockRotateLeft} />
              {labelProrrogar}
            </Button>

            <Button
              type="button"
              variant={confirmMode === 'cancelar' ? 'danger' : 'secondary'}
              onClick={() => handleSelectConfirmMode('cancelar')}
            >
              <FontAwesomeIcon icon={faTimesCircle} />
              Cancelar OS
            </Button>
          </div>
        </div>

        {!ehPredial && (confirmMode === 'concluir' || confirmMode === 'prorrogar') ? (
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
              label={labelDataConclusao}
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
                  ehPredial
                    ? 'Ex.: troca de filtros e higienizacao de todos os bebedouros da sede.'
                    : (manutencaoRealizada === false
                        ? 'Explique por que a manutencao nao aconteceu.'
                        : 'Observacoes finais da execucao.')
                }
              />
            </div>
          </div>
        ) : null}

        {confirmMode === 'prorrogar' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={labelNovaPrevisao}
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
                  ehPredial
                    ? 'Ex.: empresa terceira nao compareceu, reagendar pra proxima semana.'
                    : (manutencaoRealizada === false
                        ? 'Explique por que a manutencao nao aconteceu e o que sera feito.'
                        : 'Explique por que o equipamento continua inoperante.')
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
  statusAtual: PropTypes.string,
  categoria: PropTypes.string,
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
