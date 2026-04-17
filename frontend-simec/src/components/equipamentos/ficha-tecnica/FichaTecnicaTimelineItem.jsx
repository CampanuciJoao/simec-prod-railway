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
import {
  Badge,
  Button,
  Card,
} from '@/components/ui';
import FichaTecnicaResolveForm from '@/components/equipamentos/ficha-tecnica/FichaTecnicaResolveForm';

function getGravidadeBadgeVariant(gravidade) {
  const valor = String(gravidade || '').toLowerCase();

  if (valor === 'alta') return 'red';
  if (valor === 'media') return 'yellow';
  if (valor === 'baixa') return 'green';

  return 'slate';
}

function getOrigemBadgeVariant(origem) {
  const valor = String(origem || '').toLowerCase();

  if (valor === 'agente') return 'purple';
  if (valor === 'sistema') return 'blue';

  return 'slate';
}

function getStatusBadgeVariant(resolvido) {
  return resolvido ? 'green' : 'red';
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
    <Card
      padded={false}
      className="overflow-hidden rounded-2xl"
      surface="default"
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
        onClick={onToggle}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: item.resolvido
                ? 'var(--color-success-soft)'
                : 'var(--color-danger-soft)',
              color: item.resolvido
                ? 'var(--color-success)'
                : 'var(--color-danger)',
            }}
          >
            <FontAwesomeIcon
              icon={item.resolvido ? faCheckCircle : faExclamationTriangle}
            />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.titulo}
              </p>

              <Badge variant="slate">
                {item.tipo}
              </Badge>

              <Badge variant={getGravidadeBadgeVariant(item.gravidade)}>
                {item.gravidade || 'media'}
              </Badge>

              <Badge variant={getOrigemBadgeVariant(item.origem)}>
                {item.origem || 'usuario'}
              </Badge>

              <Badge variant={getStatusBadgeVariant(item.resolvido)}>
                {item.resolvido ? 'Resolvido' : 'Pendente'}
              </Badge>
            </div>

            <div
              className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{formatarDataHora(item.data)}</span>
              <span>Técnico: {item.tecnico || 'N/A'}</span>
            </div>
          </div>
        </div>

        <span
          className="pt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} />
        </span>
      </button>

      {expandido ? (
        <div
          className="px-4 py-4"
          style={{
            borderTop: '1px solid var(--section-header-border)',
            backgroundColor: 'var(--bg-surface-soft)',
          }}
        >
          <div className="space-y-4">
            <Card className="rounded-xl" surface="default">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Descrição
              </span>
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.descricao || 'Sem descrição.'}
              </p>
            </Card>

            {item.metadata ? (
              <Card className="rounded-xl" surface="default">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Metadata
                </span>

                <pre
                  className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg p-3 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-soft)',
                    color: 'var(--text-secondary)',
                  }}
                >
{JSON.stringify(item.metadata, null, 2)}
                </pre>
              </Card>
            ) : null}

            {item.resolvido ? (
              <Card
                className="rounded-xl"
                surface="soft"
                styleOverride={{
                  borderColor: 'var(--color-success-soft)',
                  backgroundColor: 'var(--color-success-soft)',
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--color-success)' }}
                >
                  Solução
                </span>

                <p
                  className="mt-2 text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.solucao}
                </p>

                <p
                  className="mt-2 text-xs"
                  style={{ color: 'var(--color-success)' }}
                >
                  Técnico de resolução: {item.tecnicoResolucao || 'N/A'}
                </p>
              </Card>
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
    </Card>
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