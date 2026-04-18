import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faPlus } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function SegurosPageHeader({ onCreate }) {
  return (
    <PageHeader
      title="Gestão de Seguros"
      subtitle="Acompanhe e gerencie as apólices"
      icon={faShieldAlt}
      actions={
        <Button onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Novo Seguro
        </Button>
      }
    />
  );
}

export default SegurosPageHeader;
