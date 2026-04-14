import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import Button from '../ui/primitives/Button';

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
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm no-print md:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800">
            Ação necessária: confirmar finalização
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            O tempo agendado para esta manutenção expirou. Registre o resultado
            para atualizar o sistema.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className={[
              'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
              confirmMode === 'OK'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => setConfirmMode('OK')}
          >
            <FontAwesomeIcon icon={faCheckCircle} />
            Equipamento operante
          </button>

          <button
            type="button"
            className={[
              'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
              confirmMode === 'ERRO'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => setConfirmMode('ERRO')}
          >
            <FontAwesomeIcon icon={faTimesCircle} />
            Continua inoperante
          </button>
        </div>

        {confirmMode === 'OK' && (
          <div className="max-w-md">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Data e hora real da conclusão
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={dataTerminoReal}
              onChange={(e) => setDataTerminoReal(e.target.value)}
            />
          </div>
        )}

        {confirmMode === 'ERRO' && (
          <div className="flex max-w-2xl flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Motivo da permanência da falha
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Descreva o que houve..."
                value={observacaoDecisao}
                onChange={(e) => setObservacaoDecisao(e.target.value)}
              />
            </div>

            <div className="max-w-md">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nova previsão de conclusão
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={novaPrevisao}
                onChange={(e) => setNovaPrevisao(e.target.value)}
              />
            </div>
          </div>
        )}

        {confirmMode && (
          <div>
            <Button onClick={onConfirm} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar e atualizar sistema'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default ConfirmacaoFinalManutencao;