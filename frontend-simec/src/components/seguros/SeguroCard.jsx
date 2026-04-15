import Card from '@/components/ui/primitives/Card';
import Button from '@/components/ui/primitives/Button';

import {
  getStatusBadgeClass,
  getRowHighlightClass,
  formatarMoeda,
} from '@/utils/seguros/seguro.utils';

function SeguroCard({ seguro, status, onView, onEdit, onDelete }) {
  return (
    <Card className={`border-l-4 ${getRowHighlightClass(status)}`}>
      <h3>Apólice {seguro.apoliceNumero}</h3>

      <span className={getStatusBadgeClass(status)}>
        {status}
      </span>

      <p>{seguro.seguradora}</p>

      <p>{formatarMoeda(seguro.premioTotal)}</p>

      <div className="flex gap-2">
        <Button onClick={onView}>Ver</Button>
        <Button onClick={onEdit}>Editar</Button>
        <Button variant="danger" onClick={onDelete}>Excluir</Button>
      </div>
    </Card>
  );
}

export default SeguroCard;