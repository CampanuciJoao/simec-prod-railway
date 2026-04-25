import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faHashtag,
  faCity,
  faMapMarkedAlt,
  faBuilding,
} from '@fortawesome/free-solid-svg-icons';

import { Button, Card } from '@/components/ui';

import {
  formatarCnpj,
  formatarEndereco,
} from '@/utils/unidades/unidade.utils';

function MetaItem({ icon, label, value, title = value }) {
  return (
    <div
      className="flex min-w-0 items-start gap-3 rounded-2xl border px-3 py-3"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--brand-primary)',
        }}
      >
        <FontAwesomeIcon icon={icon} />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </div>

        <div
          className="mt-1 break-words text-sm font-medium leading-6"
          style={{ color: 'var(--text-primary)' }}
          title={title || ''}
        >
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function UnidadeCard({ unidade, onEdit, onDelete }) {
  const localizacao = [unidade.cidade, unidade.estado].filter(Boolean).join(' • ');

  return (
    <Card
      className="flex h-full flex-col gap-5 rounded-3xl border p-5"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 88%, white 12%) 0%, var(--bg-surface) 100%)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Unidade
          </div>

          <h4
            className="mt-2 line-clamp-2 text-lg font-bold leading-7"
            style={{ color: 'var(--text-primary)' }}
            title={unidade.nomeSistema}
          >
            {unidade.nomeSistema}
          </h4>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
              title={unidade.nomeFantasia || 'Sem nome fantasia'}
            >
              <FontAwesomeIcon icon={faBuilding} />
              <span className="min-w-0 truncate whitespace-nowrap">
                {unidade.nomeFantasia || 'Sem nome fantasia'}
              </span>
            </span>

            {localizacao ? (
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
                  color: 'var(--brand-primary)',
                  border: '1px solid color-mix(in srgb, var(--brand-primary) 22%, transparent)',
                }}
              >
                <FontAwesomeIcon icon={faCity} />
                {localizacao}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(unidade.id)}
            className="h-10 w-10 rounded-xl border p-0"
            aria-label={`Editar unidade ${unidade.nomeSistema}`}
            title="Editar unidade"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: 'var(--bg-surface-soft)',
            }}
          >
            <FontAwesomeIcon icon={faEdit} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(unidade)}
            className="h-10 w-10 rounded-xl border p-0 text-red-600"
            aria-label={`Excluir unidade ${unidade.nomeSistema}`}
            title="Excluir unidade"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-danger) 22%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            }}
          >
            <FontAwesomeIcon icon={faTrashAlt} />
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        <MetaItem
          icon={faHashtag}
          label="CNPJ"
          value={formatarCnpj(unidade.cnpj)}
        />
        <MetaItem
          icon={faCity}
          label="Cidade"
          value={localizacao || 'Não informada'}
        />
        <MetaItem
          icon={faMapMarkedAlt}
          label="Endereço"
          value={formatarEndereco(unidade)}
        />
      </div>
    </Card>
  );
}

export default UnidadeCard;
