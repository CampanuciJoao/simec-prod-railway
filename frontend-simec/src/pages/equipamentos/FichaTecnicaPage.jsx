import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileMedical } from '@fortawesome/free-solid-svg-icons';

import { useFichaTecnicaPage } from '@/hooks/equipamentos/useFichaTecnicaPage';

import {
  Button,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

import {
  FichaTecnicaEventForm,
  FichaTecnicaTimeline,
  FichaTecnicaCorretivaStepper,
} from '@/components/equipamentos/ficha-tecnica';

function FichaTecnicaPage() {
  const page = useFichaTecnicaPage();

  if (page.loading) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader title="Ficha Tecnica" icon={faFileMedical} />
          <PageState loading />
        </div>
      </PageLayout>
    );
  }

  if (!page.equipamento) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader title="Ficha Tecnica" icon={faFileMedical} />
          <PageState
            isEmpty
            emptyMessage="Equipamento nao encontrado."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title={`Ficha Tecnica: ${page.equipamento.modelo}`}
          subtitle={`Tag: ${page.equipamento.tag || 'N/A'} | Registro rapido de eventos leves do equipamento`}
          icon={faFileMedical}
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={page.goBack}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <FichaTecnicaEventForm
          novoEvento={page.novoEvento}
          submitting={page.submitting}
          onChange={page.handleEventoChange}
          onSubmit={page.handleSubmitEvento}
          onCancel={page.goBack}
        />

        <FichaTecnicaCorretivaStepper
          corretivas={page.corretivas}
          onAdicionarNota={page.handleAdicionarNotaCorretiva}
          onAgendarVisita={page.handleAgendarVisita}
          onResolverInternamente={page.handleResolverInternamente}
          onConcluirAcao={page.handleConcluirAcaoCorretiva}
          onImprimir={page.handleImprimirOS}
          submittingId={page.submittingCorretivaId}
          onRegistrarProblema={page.handleRegistrarProblema}
          submittingNova={page.submittingNova}
        />

        <FichaTecnicaTimeline
          ocorrencias={page.ocorrencias}
          itensExpandidos={page.itensExpandidos}
          dadosSolucao={page.dadosSolucao}
          resolvendoId={page.resolvendoId}
          submitting={page.submitting}
          onToggleExpandir={page.toggleExpandir}
          onChangeSolucao={page.handleSolucaoChange}
          onAbrirResolucao={page.handleAbrirResolucao}
          onCancelarResolucao={page.handleCancelarResolucao}
          onSalvarSolucao={page.handleSalvarSolucao}
        />
      </div>
    </PageLayout>
  );
}

export default FichaTecnicaPage;
