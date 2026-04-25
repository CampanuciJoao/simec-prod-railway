import { Button, Card } from '@/components/ui';

import {
  getStatusBadgeClass,
  getRowHighlightClass,
} from '@/utils/seguros/seguro.utils';
import { getCoberturasAtivas } from '@/utils/seguros/seguroCoverageCatalog';
import {
  formatarMoeda,
  getNomeUnidade,
  getTipoSeguroLabel,
} from '@/utils/seguros/seguroFormatter';

function formatarData(value) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
  });
}

function SeguroInfoItem({ label, value, featured = false }) {
  return (
    <div
      className={[
        'min-w-0 border-b py-3',
        featured ? 'md:col-span-2' : '',
      ].join(' ')}
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p
        className={[
          'mt-1 break-words font-semibold',
          featured ? 'text-base md:text-lg' : 'text-sm',
        ].join(' ')}
        style={{ color: 'var(--text-primary)' }}
      >
        {value || 'N/A'}
      </p>
    </div>
  );
}

function SeguroCoberturasResumo({ coberturas }) {
  if (!coberturas.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Nenhuma cobertura com valor cadastrado.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {coberturas.slice(0, 6).map((cobertura) => (
        <span
          key={cobertura.key}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface-soft)',
            color: 'var(--text-secondary)',
          }}
          title={`${cobertura.label}: ${formatarMoeda(cobertura.value)}`}
        >
          <span>{cobertura.label}</span>
          <strong style={{ color: 'var(--text-primary)' }}>
            {formatarMoeda(cobertura.value)}
          </strong>
        </span>
      ))}

      {coberturas.length > 6 ? (
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: 'var(--border-soft)',
            color: 'var(--text-muted)',
          }}
        >
          +{coberturas.length - 6} coberturas
        </span>
      ) : null}
    </div>
  );
}

function SeguroCard({ seguro, status, onView, onEdit, onDelete }) {
  const coberturas = getCoberturasAtivas(seguro);
  const vigencia = `${formatarData(seguro.dataInicio)} ate ${formatarData(seguro.dataFim)}`;

  return (
    <Card
      className={`border-l-4 ${getRowHighlightClass(status)}`}
      surface="soft"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, var(--brand-primary) 6%), var(--bg-surface))',
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--brand-primary)' }}
            >
              {getTipoSeguroLabel(seguro.tipoSeguro)}
            </p>
            <h3
              className="mt-1 break-words text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Apolice {seguro.apoliceNumero || 'N/A'}
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {getNomeUnidade(seguro)}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(status)}`}
          >
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-4">
          <SeguroInfoItem
            label="Unidade"
            value={getNomeUnidade(seguro)}
            featured
          />
          <SeguroInfoItem
            label="Seguradora"
            value={seguro.seguradora}
            featured
          />
          <SeguroInfoItem
            label="Numero da apolice"
            value={seguro.apoliceNumero}
          />
          <SeguroInfoItem
            label="Vigencia"
            value={vigencia}
          />
          <SeguroInfoItem
            label="Premio total"
            value={formatarMoeda(seguro.premioTotal)}
          />
          <SeguroInfoItem
            label="Status"
            value={status}
          />
        </div>

        <div className="space-y-2">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Coberturas
          </p>
          <SeguroCoberturasResumo coberturas={coberturas} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button onClick={onView}>Ver</Button>
          <Button onClick={onEdit}>Editar</Button>
          <Button variant="danger" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default SeguroCard;
