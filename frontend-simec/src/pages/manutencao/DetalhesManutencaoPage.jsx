import React from 'react';
import { faWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useDetalhesManutencaoPage } from '../../hooks/manutencoes/useDetalhesManutencaoPage';

import DetalhesManutencaoPageHeader from '../../components/manutencoes/DetalhesManutencaoPageHeader';
import InformacoesManutencaoSection from '../../components/manutencoes/InformacoesManutencaoSection';
import ConfirmacaoFinalManutencao from '../../components/manutencoes/ConfirmacaoFinalManutencao';

import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';

function DetalhesManutencaoPage() {
  const page = useDetalhesManutencaoPage();

  const showState = page.loading || !!page.error || !page.manutencao;

  if (showState) {
    return (
      <div className="page-content-wrapper">
        <PageHeader
          title={
            page.manutencao?.numeroOS
              ? `Detalhes da Ordem de Serviço: ${page.manutencao.numeroOS}`
              : 'Detalhes da Ordem de Serviço'
          }
          icon={faWrench}
          actions={
            <button type="button" className="btn btn-secondary" onClick={page.goBack}>
              Voltar
            </button>
          }
          variant="light"
        />

        <PageState
          loading={page.loading}
          error={page.error?.message || page.error || ''}
          isEmpty={!page.loading && !page.error && !page.manutencao}
          emptyMessage="Ordem de serviço não encontrada."
        />
      </div>
    );
  }

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteAnexoModal.isOpen}
        onClose={page.deleteAnexoModal.closeModal}
        onConfirm={page.handleDeleteAnexo}
        title="Excluir Anexo"
        message="Deseja remover este anexo?"
        isDestructive
      />

      <div className="page-content-wrapper">
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
      </div>
    </>
  );
}

export default DetalhesManutencaoPage;