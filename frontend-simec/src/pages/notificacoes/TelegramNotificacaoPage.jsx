import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPlus, faKey, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { useTelegramNotificacaoPage } from '@/hooks/notificacoes/useTelegramNotificacaoPage';

import {
  Button,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

import {
  TelegramForm,
  TelegramTable,
  TelegramFormModal,
  TelegramTokenModal,
  ConfirmDeleteTelegramModal,
} from '@/components/telegram';

function TelegramNotificacaoPage() {
  const navigate = useNavigate();
  const page = useTelegramNotificacaoPage();

  const createAction = (
    <Button type="button" onClick={page.handleOpenCreate}>
      <FontAwesomeIcon icon={faPlus} />
      Adicionar destinatário
    </Button>
  );

  const tokenAction = (
    <Button type="button" variant="secondary" onClick={page.handleGerarToken} disabled={page.gerandoToken}>
      <FontAwesomeIcon icon={faKey} />
      {page.gerandoToken ? 'Gerando...' : 'Vincular via código'}
    </Button>
  );

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <ConfirmDeleteTelegramModal
          isOpen={page.isDeleteModalOpen}
          dest={page.destToDelete}
          onClose={page.closeDeleteModal}
          onConfirm={page.handleConfirmDelete}
        />

        <TelegramFormModal
          open={page.isFormModalOpen}
          onClose={page.handleCloseFormModal}
          title={page.editingDest ? 'Editar destinatário' : 'Novo destinatário'}
        >
          <TelegramForm
            initialData={page.editingDest}
            onSubmit={page.handleSave}
            onCancel={page.handleCloseFormModal}
            isSubmitting={page.isSubmitting}
          />
        </TelegramFormModal>

        <TelegramTokenModal
          open={page.isTokenModalOpen}
          tokenData={page.tokenData}
          botUsername="SimecAlertasBot"
          onClose={page.closeTokenModal}
        />

        <PageHeader
          title="Notificações Telegram"
          subtitle="Gerencie os destinatários de alertas via Telegram e suas preferências de envio"
          icon={faPaperPlane}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Voltar
              </Button>
              {tokenAction}
              {createAction}
            </div>
          }
        />

        <PageSection
          title="Destinatários cadastrados"
          description="Chats privados e grupos que recebem alertas do sistema via bot do Telegram."
        >
          {page.loading ? (
            <PageState loading />
          ) : page.isEmpty ? (
            <PageState isEmpty emptyMessage="Nenhum destinatário cadastrado." />
          ) : (
            <TelegramTable
              destinatarios={page.destinatarios}
              onEdit={page.handleOpenEdit}
              onDelete={page.openDeleteModal}
            />
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default TelegramNotificacaoPage;
