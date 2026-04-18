import { Button, Card } from '@/components/ui';

import {
  getStatusBadgeClass,
  getRowHighlightClass,
  formatarMoeda,
} from '@/utils/seguros/seguro.utils';

function SeguroCard({ seguro, status, onView, onEdit, onDelete }) {
  return (
    <Card className={`border-l-4 ${getRowHighlightClass(status)}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-slate-900">
              Apólice {seguro.apoliceNumero}
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              {seguro.seguradora}
            </p>
          </div>

          <span className={getStatusBadgeClass(status)}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Seguradora
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {seguro.seguradora || 'N/A'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prêmio total
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatarMoeda(seguro.premioTotal)}
            </p>
          </div>
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
