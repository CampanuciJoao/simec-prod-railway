import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faShieldAlt, faRotate } from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import { useRenovarSeguroPage } from '@/hooks/seguros/useRenovarSeguroPage';

import SeguroForm from '@/components/seguros/SeguroForm';

import {
  Button,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

function RenovarSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const page = useRenovarSeguroPage({ id, addToast, navigate });

  const apoliceAnterior = page.seguroAnterior?.apoliceNumero;
  const title = `Renovar Seguro${apoliceAnterior ? ` — Apólice ${apoliceAnterior}` : ''}`;
  const subtitle = 'Preencha os dados da nova apólice. A apólice anterior será marcada como substituída e ficará acessível no histórico.';

  const headerActions = (
    <Button variant="secondary" onClick={() => navigate(-1)}>
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

  if (!page.seguroAnterior) {
    return (
      <PageLayout padded>
        <div className="flex flex-col gap-5">
          <PageHeader title="Renovar Seguro" subtitle="Apólice não encontrada." icon={faShieldAlt} actions={headerActions} />
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

        {/* Banner informativo */}
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--color-warning-soft, #fef9c3)',
            borderColor: 'var(--color-warning, #ca8a04)',
            color: 'var(--color-warning-text, #713f12)',
          }}
        >
          <FontAwesomeIcon icon={faRotate} className="mt-0.5 shrink-0" />
          <span>
            Preencha o número da nova apólice, a vigência e o prêmio. Os demais campos foram
            pré-preenchidos com os dados da apólice anterior. Ao salvar, a apólice{' '}
            <strong>{apoliceAnterior}</strong> será marcada como substituída e permanecerá
            acessível no histórico de renovações.
          </span>
        </div>

        <SeguroForm
          initialData={page.initialData}
          onSubmit={page.handleRenovar}
          isEditing={false}
          equipamentosDisponiveis={page.equipamentos}
          unidadesDisponiveis={page.unidades}
          anexos={[]}
          onCancel={() => navigate(-1)}
          submitLabel="Renovar Apólice"
        />
      </div>
    </PageLayout>
  );
}

export default RenovarSeguroPage;
