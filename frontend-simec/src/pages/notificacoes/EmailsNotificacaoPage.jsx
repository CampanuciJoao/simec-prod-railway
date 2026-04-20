import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPlus } from '@fortawesome/free-solid-svg-icons';

import { useEmailsNotificacaoPage } from '@/hooks/notificacoes/useEmailsNotificacaoPage';

import {
  Button,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

import {
  EmailForm,
  EmailsTable,
  EmailFormModal,
  ConfirmDeleteEmailModal,
} from '@/components/emails';

function EmailsNotificacaoPage() {
  const page = useEmailsNotificacaoPage();

  const createAction = (
    <Button type="button" onClick={page.handleOpenCreate}>
      <FontAwesomeIcon icon={faPlus} />
      Adicionar e-mail
    </Button>
  );

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <ConfirmDeleteEmailModal
          isOpen={page.isDeleteModalOpen}
          email={page.emailToDelete}
          onClose={page.closeDeleteModal}
          onConfirm={page.handleConfirmDelete}
        />

        <EmailFormModal
          open={page.isFormModalOpen}
          onClose={page.handleCloseFormModal}
          title={page.formModalTitle}
        >
          <EmailForm
            initialData={page.editingEmail}
            onSubmit={page.handleSave}
            onCancel={page.handleCloseFormModal}
            isSubmitting={page.isSubmitting}
          />
        </EmailFormModal>

        <PageHeader
          title="E-mails de Notificação"
          subtitle="Gerencie os destinatários de alertas e suas preferências de envio"
          icon={faEnvelope}
          actions={createAction}
        />

        <PageSection
          title="Lista de destinatários"
          description="Configure antecedência e subscrições de contratos, manutenções e seguros."
          headerRight={!page.loading && !page.isEmpty ? createAction : null}
        >
          {page.loading ? (
            <PageState loading />
          ) : page.isEmpty ? (
            <div className="space-y-4">
              <PageState isEmpty emptyMessage="Nenhum e-mail cadastrado." />
              <div className="flex justify-center sm:justify-start">
                {createAction}
              </div>
            </div>
          ) : (
            <EmailsTable
              emails={page.emails}
              onEdit={page.handleOpenEdit}
              onDelete={page.openDeleteModal}
            />
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default EmailsNotificacaoPage;
