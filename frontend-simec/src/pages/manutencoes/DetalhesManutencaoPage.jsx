import React from 'react';
import { faWrench } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesManutencaoPage } from '@/hooks/manutencoes/useDetalhesManutencaoPage';

import ConfirmacaoFinalManutencao from '@/components/manutencoes/ConfirmacaoFinalManutencao';
import DetalhesManutencaoPageHeader from '@/components/manutencoes/DetalhesManutencaoPageHeader';
import HistoricoEAnexosManutencaoSection from '@/components/manutencoes/HistoricoEAnexosManutencaoSection';
import InformacoesManutencaoSection from '@/components/manutencoes/InformacoesManutencaoSection';

import {
  Button,
  ModalConfirmacao,
  PageHeader,
  PageLayout,
  PageState,
  Textarea,
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
              ? `Detalhes da Ordem de Servico: ${page.manutencao.numeroOS}`
              : 'Detalhes da Ordem de Servico'
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
          emptyMessage="Ordem de servico nao encontrada."
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
        onConfirm={page.handleCancelarManutencao}
        title="Cancelar manutencao"
        message="Informe a justificativa para cancelar esta ordem de servico."
        confirmText="Confirmar cancelamento"
        cancelText="Voltar"
        isDestructive
        confirmDisabled={!page.cancelReason.trim()}
      >
        <Textarea
          label="Justificativa"
          rows={3}
          value={page.cancelReason}
          onChange={(event) => page.setCancelReason(event.target.value)}
          placeholder="Explique por que a OS esta sendo cancelada."
        />
      </ModalConfirmacao>

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

        <ConfirmacaoFinalManutencao
          visible={page.manutencao.status === 'AguardandoConfirmacao'}
          confirmMode={page.confirmMode}
          setConfirmMode={page.setConfirmMode}
          manutencaoRealizada={page.manutencaoRealizada}
          setManutencaoRealizada={page.setManutencaoRealizada}
          dataTerminoReal={page.dataTerminoReal}
          setDataTerminoReal={page.setDataTerminoReal}
          novaPrevisao={page.novaPrevisao}
          setNovaPrevisao={page.setNovaPrevisao}
          observacaoDecisao={page.observacaoDecisao}
          setObservacaoDecisao={page.setObservacaoDecisao}
          onConfirm={page.handleConfirmacaoFinal}
          canConfirm={page.canConfirmFinal}
          submitting={page.submitting}
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
      </PageLayout>
    </>
  );
}

export default DetalhesManutencaoPage;
