import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faBuilding } from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/ui/primitives/Button';
import { PageHeader } from '@/components/ui/layout';

function UnidadesPageHeader({ onCreate }) {
  return (
    <PageHeader
      title="Unidades"
      subtitle="Acompanhe e gerencie as unidades cadastradas"
      icon={faBuilding}
      actions={
        <Button onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Nova Unidade
        </Button>
      }
    />
  );
}

export default UnidadesPageHeader;