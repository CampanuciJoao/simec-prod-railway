import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faHashtag,
  faCity,
  faMapMarkedAlt,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';
import Button from '@/components/ui/primitives/Button';

import { formatarEndereco } from '@/utils/unidades/unidade.utils';

function UnidadeCard({ unidade, onEdit, onDelete }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex justify-between">
        <div>
          <h4>{unidade.nomeSistema}</h4>
          <p>{unidade.nomeFantasia}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onEdit(unidade.id)}>
            <FontAwesomeIcon icon={faEdit} />
          </Button>

          <Button
            variant="ghost"
            onClick={() => onDelete(unidade)}
            className="text-red-600"
          >
            <FontAwesomeIcon icon={faTrashAlt} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span>
          <FontAwesomeIcon icon={faHashtag} /> {unidade.cnpj}
        </span>

        <span>
          <FontAwesomeIcon icon={faCity} /> {unidade.cidade}
        </span>

        <span>
          <FontAwesomeIcon icon={faMapMarkedAlt} /> {formatarEndereco(unidade)}
        </span>
      </div>
    </Card>
  );
}

export default UnidadeCard;