import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashAlt,
  faSpinner,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Card,
  EmptyState,
} from '@/components/ui';

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
        const { icon, colorClass } = getIconePorTipoArquivo(anexo.tipoMime);
        const downloadUrl = montarUrlDownload(anexo.path);

        return (
          <Card
            key={anexo.id}
            className="rounded-2xl"
            surface="soft"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={[
                    'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    colorClass,
                  ].join(' ')}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <FontAwesomeIcon icon={icon} />
                </span>

                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {anexo.nomeOriginal || 'Arquivo sem nome'}
                  </p>

                  <div
                    className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{anexo.tipoMime || 'Tipo desconhecido'}</span>
                    <span>Enviado em {formatarData(anexo.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3"
                  title="Baixar arquivo"
                  aria-label={`Baixar ${anexo.nomeOriginal || 'anexo'}`}
                  onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
                >
                  <FontAwesomeIcon icon={faDownload} />
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  className="px-3"
                  onClick={() => onDelete(anexo)}
                  disabled={isSubmitting}
                  title="Excluir arquivo"
                  aria-label={`Excluir ${anexo.nomeOriginal || 'anexo'}`}
                >
                  <FontAwesomeIcon
                    icon={isSubmitting ? faSpinner : faTrashAlt}
                    spin={isSubmitting}
                  />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default AnexosList;