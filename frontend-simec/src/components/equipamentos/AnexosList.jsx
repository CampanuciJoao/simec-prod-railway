import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashAlt,
  faSpinner,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';

import { EmptyState } from '@/components/ui';

import { formatarData } from '@/utils/timeUtils';

function AnexosList({
  anexos = [],
  isSubmitting = false,
  onDelete,
  getIconePorTipoArquivo,
  montarUrlDownload,
}) {
  if (anexos.length === 0) {
    return (
      <EmptyState message="Nenhum anexo vinculado a este equipamento." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {anexos.map((anexo) => {
        const { icon, colorClass } = getIconePorTipoArquivo(
          anexo.tipoMime
        );

        const downloadUrl = montarUrlDownload(anexo.path);

        return (
          <div
            key={anexo.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={[
                  'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50',
                  colorClass,
                ].join(' ')}
              >
                <FontAwesomeIcon icon={icon} />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {anexo.nomeOriginal || 'Arquivo sem nome'}
                </p>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{anexo.tipoMime || 'Tipo desconhecido'}</span>
                  <span>
                    Enviado em {formatarData(anexo.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <FontAwesomeIcon icon={faDownload} />
              </a>

              <button
                type="button"
                onClick={() => onDelete(anexo)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white disabled:opacity-60"
                disabled={isSubmitting}
              >
                <FontAwesomeIcon
                  icon={isSubmitting ? faSpinner : faTrashAlt}
                  spin={isSubmitting}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AnexosList;