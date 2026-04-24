import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { faShieldAlt } from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import { useSalvarSeguroPage } from '@/hooks/seguros/useSalvarSeguroPage';

import SeguroForm from '@/components/seguros/SeguroForm';

import {
  PageLayout,
  PageHeader,
  PageState,
  Button,
} from '@/components/ui';

function SalvarSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const page = useSalvarSeguroPage({
    id,
    addToast,
    navigate,
  });

  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Seguro" icon={faShieldAlt} />
        <PageState loading />
      </PageLayout>
    );
  }

  if (page.error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Erro" icon={faShieldAlt} />
        <PageState error={page.error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={page.isEditing ? 'Editar Seguro' : 'Novo Seguro'}
        icon={faShieldAlt}
        actions={
          <Button variant="secondary" onClick={() => navigate('/seguros')}>
            Voltar
          </Button>
        }
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
    </PageLayout>
  );
}

export default SalvarSeguroPage;
