import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faCheckCircle, faWrench } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesManutencaoPage } from '@/hooks/manutencoes/useDetalhesManutencaoPage';

import AgendarVisitaDrawer from '@/components/manutencoes/AgendarVisitaDrawer';
import ConfirmacaoFinalManutencao from '@/components/manutencoes/ConfirmacaoFinalManutencao';
import DetalhesManutencaoPageHeader from '@/components/manutencoes/DetalhesManutencaoPageHeader';
import HistoricoEAnexosManutencaoSection from '@/components/manutencoes/HistoricoEAnexosManutencaoSection';
import InformacoesManutencaoSection from '@/components/manutencoes/InformacoesManutencaoSection';

import {
  Button,
  Card,
  ModalConfirmacao,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
  Textarea,
} from '@/components/ui';

function DetalhesManutencaoPage() {
  const page = useDetalhesManutencaoPage();

  const [agendarVisitaOpen, setAgendarVisitaOpen] = useState(false);
  const [resolverOpen, setResolverOpen] = useState(false);
  const [resolucaoTexto, setResolucaoTexto] = useState('');

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

  async function handleResolverInternamente() {
    if (!resolucaoTexto.trim()) return;
    const ok = await page.handleResolverInternamente(resolucaoTexto.trim());
    if (ok) {
      setResolverOpen(false);
      setResolucaoTexto('');
    }
  }

  return (
    <>
      <AgendarVisitaDrawer
        isOpen={agendarVisitaOpen}
        onClose={() => setAgendarVisitaOpen(false)}
        onConfirm={page.handleAgendarVisita}
        submitting={page.submitting}
      />

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

        {page.manutencao.status === 'Pendente' ? (
          <PageSection
            title="Proximos passos"
            description="Esta OS esta em triagem. Escolha como prosseguir."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => setAgendarVisitaOpen(true)}
                  disabled={page.submitting}
                >
                  <FontAwesomeIcon icon={faCalendarCheck} />
                  Agendar visita tecnica
                </Button>

                {!resolverOpen ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setResolverOpen(true)}
                    disabled={page.submitting}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Resolver internamente
                  </Button>
                ) : null}
              </div>

              {resolverOpen ? (
                <Card surface="soft">
                  <div className="space-y-3">
                    <Textarea
                      label="Como foi resolvido?"
                      value={resolucaoTexto}
                      onChange={(e) => setResolucaoTexto(e.target.value)}
                      rows={3}
                      placeholder="Descreva como o problema foi resolvido sem necessidade de visita tecnica."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => { setResolverOpen(false); setResolucaoTexto(''); }}
                        disabled={page.submitting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        onClick={handleResolverInternamente}
                        disabled={!resolucaoTexto.trim() || page.submitting}
                      >
                        {page.submitting ? 'Salvando...' : 'Confirmar resolucao'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>
          </PageSection>
        ) : null}

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
