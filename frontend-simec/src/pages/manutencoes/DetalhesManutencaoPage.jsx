import React from 'react';
import { faWrench } from '@fortawesome/free-solid-svg-icons';

// HOOK
import { useDetalhesManutencaoPage } from '@/hooks/manutencoes/useDetalhesManutencaoPage';

// DOMAIN
import ConfirmacaoFinalManutencao from '@/components/manutencoes/ConfirmacaoFinalManutencao';
import DetalhesManutencaoPageHeader from '@/components/manutencoes/DetalhesManutencaoPageHeader';
import HistoricoEAnexosManutencaoSection from '@/components/manutencoes/HistoricoEAnexosManutencaoSection';
import InformacoesManutencaoSection from '@/components/manutencoes/InformacoesManutencaoSection';

// UI
import {
  Button,
  ModalConfirmacao,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

function DetalhesManutencaoPage() {
  const page = useDetalhesManutencaoPage();

  const showState = page.loading || !!page.error || !page.manutencao;

  if (showState) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={
            page.manutencao?.numeroOS
              ? `Detalhes da Ordem de Serviço: ${page.manutencao.numeroOS}`
              : 'Detalhes da Ordem de Serviço'
          }
          icon={faWrench}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
              Voltar
            </Button>
          }
        />

        <PageState
          loading={page.loading}
          error={page.error?.message || page.error || ''}
          isEmpty={!page.loading && !page.error && !page.manutencao}
          emptyMessage="Ordem de serviço não encontrada."
        />
      </PageLayout>
    );
  }

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteAnexoModal.isOpen}
        onClose={page.deleteAnexoModal.closeModal}
        onConfirm={page.handleDeleteAnexo}
        title="Excluir anexo"
        message="Deseja remover este anexo?"
        isDestructive
      />

      <ModalConfirmacao
        isOpen={page.cancelModal.isOpen}
        onClose={page.cancelModal.closeModal}
        onConfirm={() =>
          page.handleCancelarManutencao(
            'Cancelada manualmente a partir da tela de detalhes.'
          )
        }
        title="Cancelar manutenção"
        message="Tem certeza que deseja cancelar esta ordem de serviço?"
        confirmText="Confirmar cancelamento"
        cancelText="Voltar"
        isDestructive
      />

      <PageLayout
        background="slate"
        padded
        fullHeight
        contentClassName="space-y-6"
      >
        <DetalhesManutencaoPageHeader
          numeroOS={page.manutencao.numeroOS}
          onPrint={page.handlePrint}
          onBack={page.goBack}
        />

        <InformacoesManutencaoSection
          manutencao={page.manutencao}
          formData={page.formData}
          onFormChange={page.handleFormChange}
          onSalvarAlteracoes={page.handleSalvarAlteracoes}
          onAbrirCancelamento={page.cancelModal.openModal}
          camposPrincipaisBloqueados={page.camposPrincipaisBloqueados}
          isCancelavel={page.isCancelavel}
          submitting={page.submitting}
        />

        <HistoricoEAnexosManutencaoSection
          manutencao={page.manutencao}
          onAdicionarNota={page.handleAdicionarNota}
          onUploadAnexos={page.handleUploadAnexos}
          onRemoverAnexo={page.handleAskDeleteAnexo}
          submitting={page.submitting}
        />

        <ConfirmacaoFinalManutencao
          visible={page.manutencao.status === 'AguardandoConfirmacao'}
          confirmMode={page.confirmMode}
          setConfirmMode={page.setConfirmMode}
          dataTerminoReal={page.dataTerminoReal}
          setDataTerminoReal={page.setDataTerminoReal}
          novaPrevisao={page.novaPrevisao}
          setNovaPrevisao={page.setNovaPrevisao}
          observacaoDecisao={page.observacaoDecisao}
          setObservacaoDecisao={page.setObservacaoDecisao}
          onConfirm={page.handleConfirmacaoFinal}
          submitting={page.submitting}
        />
      </PageLayout>
    </>
  );
}

export default DetalhesManutencaoPage;