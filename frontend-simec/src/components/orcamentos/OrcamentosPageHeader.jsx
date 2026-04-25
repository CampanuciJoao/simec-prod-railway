import { faPlus, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, PageHeader } from '@/components/ui';

function OrcamentosPageHeader({ onNovo }) {
  return (
    <PageHeader
      icon={faFileInvoiceDollar}
      title="Orçamentos"
      subtitle="Crie e gerencie orçamentos para aprovação da diretoria"
      actions={
        <Button onClick={onNovo} variant="primary" size="sm">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Novo Orçamento
        </Button>
      }
    />
  );
}

export default OrcamentosPageHeader;
