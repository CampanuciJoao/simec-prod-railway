import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBuilding } from '@fortawesome/free-solid-svg-icons';

import { useSalvarUnidadePage } from '@/hooks/unidades/useSalvarUnidadePage';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageState from '@/components/ui/feedback/PageState';
import Button from '@/components/ui/primitives/Button';

import UnidadeForm from '@/components/unidades/UnidadeForm';

function SalvarUnidadePage() {
  const page = useSalvarUnidadePage();

  const title = page.isEditing
    ? 'Editar Unidade'
    : 'Nova Unidade';

  const subtitle =
    'Cadastre e gerencie informações da unidade';

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={page.goBackToMenu}>
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar ao menu
      </Button>

      <Button variant="secondary" onClick={page.goBackToList}>
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar para unidades
      </Button>
    </div>
  );

  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title={title} subtitle={subtitle} icon={faBuilding} />
        <PageState loading />
      </PageLayout>
    );
  }

  if (page.error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={faBuilding}
          actions={headerActions}
        />
        <PageState error={page.error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={faBuilding}
        actions={headerActions}
      />

      <UnidadeForm
        onSubmit={page.handleSubmit}
        initialData={page.initialData}
        isEditing={page.isEditing}
        onCancel={page.goBackToList}
      />
    </PageLayout>
  );
}

export default SalvarUnidadePage;