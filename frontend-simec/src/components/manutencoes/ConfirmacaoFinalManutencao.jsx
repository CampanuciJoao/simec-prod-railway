import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faTriangleExclamation,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

import { Button, Input, PageSection } from '../ui';

function ModoButton({ active, icon, label, tone = 'slate', onClick }) {
  const activeMap = {
    green: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
    amber: 'bg-amber-600 text-white hover:bg-amber-700 border-amber-600',
    red: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
    slate: 'bg-slate-700 text-white hover:bg-slate-800 border-slate-700',
  };

  const inactive =
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
        active ? activeMap[tone] || activeMap.slate : inactive,
      ].join(' ')}
    >
      <FontAwesomeIcon icon={icon} />
      {label}
    </button>
  );
}

ModoButton.propTypes = {
  active: PropTypes.bool,
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['green', 'amber', 'red', 'slate']),
  onClick: PropTypes.func.isRequired,
};

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
      className="border-2 border-amber-300 bg-amber-50"
      title="Ação necessária: confirmar finalização"
      description="O tempo agendado para esta manutenção expirou. Registre o resultado para atualizar o sistema."
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            Escolha o desfecho operacional desta OS
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Você pode concluir, prorrogar a previsão ou cancelar a manutenção.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ModoButton
          active={confirmMode === 'concluir'}
          icon={faCheckCircle}
          label="Equipamento operante"
          tone="green"
          onClick={() => setConfirmMode('concluir')}
        />

        <ModoButton
          active={confirmMode === 'prorrogar'}
          icon={faClockRotateLeft}
          label="Continua inoperante"
          tone="amber"
          onClick={() => setConfirmMode('prorrogar')}
        />

        <ModoButton
          active={confirmMode === 'cancelar'}
          icon={faTimesCircle}
          label="Cancelar OS"
          tone="red"
          onClick={() => setConfirmMode('cancelar')}
        />
      </div>

      {confirmMode === 'concluir' && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Data e hora real da conclusão
            </label>
            <Input
              type="datetime-local"
              value={dataTerminoReal}
              onChange={(e) => setDataTerminoReal(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Observação final
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Ex.: Equipamento testado e liberado para operação."
              value={observacaoDecisao}
              onChange={(e) => setObservacaoDecisao(e.target.value)}
            />
          </div>
        </div>
      )}

      {confirmMode === 'prorrogar' && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nova previsão
            </label>
            <Input
              type="datetime-local"
              value={novaPrevisao}
              onChange={(e) => setNovaPrevisao(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Motivo / observação
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Descreva o motivo da prorrogação."
              value={observacaoDecisao}
              onChange={(e) => setObservacaoDecisao(e.target.value)}
            />
          </div>
        </div>
      )}

      {confirmMode === 'cancelar' && (
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Motivo do cancelamento
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Descreva o motivo do cancelamento."
            value={observacaoDecisao}
            onChange={(e) => setObservacaoDecisao(e.target.value)}
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