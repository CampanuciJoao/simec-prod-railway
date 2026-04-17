import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  Card,
  EmptyState,
  LoadingState,
} from '@/components/ui';

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
    return <EmptyState message="Nenhum acessório cadastrado." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {acessorios.map((acessorio) => (
        <Card
          key={acessorio.id}
          className="rounded-2xl"
          surface="soft"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {acessorio.nome}
              </div>

              <div
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Nº Série: {acessorio.numeroSerie || 'N/A'}
              </div>

              <div
                className="text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {acessorio.descricao || 'Sem descrição'}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onEdit(acessorio)}
                disabled={submitting}
                aria-label={`Editar acessório ${acessorio.nome}`}
                title="Editar acessório"
                className="px-3"
              >
                <FontAwesomeIcon icon={faEdit} />
              </Button>

              <Button
                type="button"
                variant="danger"
                onClick={() => onDelete(acessorio)}
                disabled={submitting}
                aria-label={`Excluir acessório ${acessorio.nome}`}
                title="Excluir acessório"
                className="px-3"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default AcessoriosList;