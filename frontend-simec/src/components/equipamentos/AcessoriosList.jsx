import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import { LoadingState } from '@/components/ui';

function AcessoriosList({
  acessorios = [],
  loading = false,
  submitting = false,
  showForm = false,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return <LoadingState message="Carregando acessórios..." />;
  }

  if (acessorios.length === 0 && !showForm) {
    return (
      <div className="text-sm text-slate-500">
        Nenhum acessório cadastrado.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {acessorios.map((acessorio) => (
        <div
          key={acessorio.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-800">
                {acessorio.nome}
              </div>

              <div className="text-xs text-slate-500">
                Nº Série: {acessorio.numeroSerie || 'N/A'}
              </div>

              <div className="text-xs text-slate-500">
                {acessorio.descricao || 'Sem descrição'}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(acessorio)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-600 hover:text-white"
                disabled={submitting}
                aria-label={`Editar acessório ${acessorio.nome}`}
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(acessorio)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white"
                disabled={submitting}
                aria-label={`Excluir acessório ${acessorio.nome}`}
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AcessoriosList;