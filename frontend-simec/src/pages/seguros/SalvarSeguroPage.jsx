import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import { useSalvarSeguroPage } from '@/hooks/seguros/useSalvarSeguroPage';

import SeguroForm from '@/components/seguros/SeguroForm';

import {
  Button,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

function SalvarSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const page = useSalvarSeguroPage({ id, addToast, navigate });

  const title = page.isEditing
    ? `Editar Seguro${page.initialData?.apoliceNumero ? ` — ${page.initialData.apoliceNumero}` : ''}`
    : 'Novo Seguro';

  const subtitle = page.isEditing
    ? 'Atualize os dados da apólice, coberturas e vínculo.'
    : 'Cadastre uma nova apólice com dados de vigência e coberturas.';

  const headerActions = (
    <Button variant="secondary" onClick={() => navigate('/seguros')}>
      <FontAwesomeIcon icon={faArrowLeft} />
      Voltar
    </Button>
  );

  if (page.loading) {
    return (
      <PageLayout padded>
        <div className="flex flex-col gap-5">
          <PageHeader title={title} subtitle={subtitle} icon={faShieldAlt} actions={headerActions} />
          <PageState loading />
        </div>
      </PageLayout>
    );
  }

  if (page.error) {
    return (
      <PageLayout padded>
        <div className="flex flex-col gap-5">
          <PageHeader title={title} subtitle={subtitle} icon={faShieldAlt} actions={headerActions} />
          <PageState error={page.error} />
        </div>
      </PageLayout>
    );
  }

  if (page.isEditing && !page.initialData) {
    return (
      <PageLayout padded>
        <div className="flex flex-col gap-5">
          <PageHeader title="Editar Seguro" subtitle="A apólice solicitada não foi encontrada." icon={faShieldAlt} actions={headerActions} />
          <PageState isEmpty emptyMessage="Seguro não encontrado." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded>
      <div className="flex flex-col gap-5">
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={faShieldAlt}
          actions={headerActions}
        />

        <SeguroForm
          initialData={page.initialData}
          onSubmit={page.handleSave}
          isEditing={page.isEditing}
          equipamentosDisponiveis={page.equipamentos}
          unidadesDisponiveis={page.unidades}
          anexos={page.anexos}
          onDelete={page.isEditing ? page.handleDelete : undefined}
          onCancel={() => navigate('/seguros')}
        />
      </div>
    </PageLayout>
  );
}

export default SalvarSeguroPage;
