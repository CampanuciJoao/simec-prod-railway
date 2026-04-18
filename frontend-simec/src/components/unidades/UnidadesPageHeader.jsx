import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faBuilding } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

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
