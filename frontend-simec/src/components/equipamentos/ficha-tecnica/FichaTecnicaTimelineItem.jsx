import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

import { formatarDataHora } from '@/utils/timeUtils';
import Button from '@/components/ui/primitives/Button';
import FichaTecnicaResolveForm from '@/components/equipamentos/ficha-tecnica/FichaTecnicaResolveForm';

function getGravidadeBadgeClass(gravidade) {
  const valor = String(gravidade || '').toLowerCase();

  if (valor === 'alta') return 'border-red-200 bg-red-100 text-red-700';
  if (valor === 'media') return 'border-amber-200 bg-amber-100 text-amber-700';
  if (valor === 'baixa') return 'border-emerald-200 bg-emerald-100 text-emerald-700';

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function Badge({ children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function FichaTecnicaTimelineItem({
  item,
  expandido,
  payloadSolucao,
  isResolvendo,
  submitting,
  onToggle,
  onChangeSolucao,
  onAbrirResolucao,
  onCancelarResolucao,
  onSalvarSolucao,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50"
        onClick={onToggle}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              item.resolvido
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            <FontAwesomeIcon
              icon={item.resolvido ? faCheckCircle : faExclamationTriangle}
            />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {item.titulo}
              </p>

              <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                {item.tipo}
              </Badge>

              <Badge className={getGravidadeBadgeClass(item.gravidade)}>
                {item.gravidade || 'media'}
              </Badge>

              <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                {item.origem || 'usuario'}
              </Badge>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{formatarDataHora(item.data)}</span>
              <span>Técnico: {item.tecnico || 'N/A'}</span>
              <span>Status: {item.resolvido ? 'Resolvido' : 'Pendente'}</span>
            </div>
          </div>
        </div>

        <span className="pt-1 text-slate-400">
          <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} />
        </span>
      </button>

      {expandido ? (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Descrição
              </span>
              <p className="mt-2 text-sm text-slate-700">
                {item.descricao || 'Sem descrição.'}
              </p>
            </div>

            {item.metadata ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Metadata
                </span>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
{JSON.stringify(item.metadata, null, 2)}
                </pre>
              </div>
            ) : null}

            {item.resolvido ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Solução
                </span>
                <p className="mt-2 text-sm text-emerald-800">
                  {item.solucao}
                </p>
                <p className="mt-2 text-xs text-emerald-700">
                  Técnico de resolução: {item.tecnicoResolucao || 'N/A'}
                </p>
              </div>
            ) : isResolvendo ? (
              <FichaTecnicaResolveForm
                payload={payloadSolucao}
                submitting={submitting}
                onChange={onChangeSolucao}
                onCancel={onCancelarResolucao}
                onConfirm={onSalvarSolucao}
              />
            ) : (
              <div className="flex justify-end">
                <Button type="button" onClick={onAbrirResolucao}>
                  Resolver evento
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

FichaTecnicaTimelineItem.propTypes = {
  item: PropTypes.object.isRequired,
  expandido: PropTypes.bool.isRequired,
  payloadSolucao: PropTypes.object,
  isResolvendo: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onChangeSolucao: PropTypes.func.isRequired,
  onAbrirResolucao: PropTypes.func.isRequired,
  onCancelarResolucao: PropTypes.func.isRequired,
  onSalvarSolucao: PropTypes.func.isRequired,
};

export default FichaTecnicaTimelineItem;