import React from 'react';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

import { useEmailsNotificacaoPage } from '@/hooks/notificacoes/useEmailsNotificacaoPage';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageSection from '@/components/ui/layout/PageSection';
import PageState from '@/components/ui/feedback/PageState';

import {
  EmailForm,
  EmailsTable,
  EmailFormModal,
  ConfirmDeleteEmailModal,
} from '@/components/emails';

function EmailsNotificacaoPage() {
  const page = useEmailsNotificacaoPage();

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
        />

        <PageSection
          title="Lista de destinatários"
          description="Configure antecedência e subscrições de contratos, manutenções e seguros."
        >
          {page.loading ? (
            <PageState loading />
          ) : page.isEmpty ? (
            <PageState isEmpty emptyMessage="Nenhum e-mail cadastrado." />
          ) : (
            <EmailsTable
              emails={page.emails}
              onCreate={page.handleOpenCreate}
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