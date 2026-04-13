import React from 'react';
import { faWrench } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesManutencaoPage } from '../../hooks/manutencoes/useDetalhesManutencaoPage';

import DetalhesManutencaoPageHeader from '../../components/manutencoes/DetalhesManutencaoPageHeader';
import InformacoesManutencaoSection from '../../components/manutencoes/InformacoesManutencaoSection';
import ConfirmacaoFinalManutencao from '../../components/manutencoes/ConfirmacaoFinalManutencao';
import HistoricoEAnexosManutencaoSection from '../../components/manutencoes/HistoricoEAnexosManutencaoSection';

import Button from '../../components/ui/Button';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageHeader from '../../components/ui/PageHeader';
import PageLayout from '../../components/ui/PageLayout';
import PageState from '../../components/ui/PageState';

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

      <PageLayout background="slate" padded fullHeight contentClassName="space-y-6">
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