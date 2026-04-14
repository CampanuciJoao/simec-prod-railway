import React from 'react';
import { faMicrochip } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesEquipamentoPage } from '../../hooks/equipamentos/useDetalhesEquipamentoPage';
import DetalhesEquipamentoTabs from '../../components/equipamentos/DetalhesEquipamentoTabs';
import DetalhesEquipamentoTabContent from '../../components/equipamentos/DetalhesEquipamentoTabContent';
import {
  PageLayout,
  PageHeader,
  PageSection,
  EmptyState,
  LoadingState,
} from '../../components/ui/layout';

function DetalhesEquipamentoPage() {
  const {
    equipamentoId,
    equipamento,
    loading,
    error,
    refetchEquipamento,
    abaAtiva,
    setAbaAtiva,
    abas,
  } = useDetalhesEquipamentoPage();

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Detalhes do Equipamento"
          icon={faMicrochip}
          actions={
            <button className="btn btn-secondary" onClick={() => window.history.back()}>
              Voltar
            </button>
          }
        />

        <LoadingState message="Carregando equipamento..." />
      </PageLayout>
    );
  }

  if (error || !equipamento) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Detalhes do Equipamento"
          icon={faMicrochip}
          actions={
            <button className="btn btn-secondary" onClick={() => window.history.back()}>
              Voltar
            </button>
          }
        />

        <EmptyState
          message={error || 'O equipamento solicitado não foi encontrado.'}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={`Detalhes do Equipamento: ${equipamento.modelo}`}
        icon={faMicrochip}
        actions={
          <button className="btn btn-secondary" onClick={() => window.history.back()}>
            Voltar
          </button>
        }
      />

      <PageSection>
        <DetalhesEquipamentoTabs
          abas={abas}
          abaAtiva={abaAtiva}
          onChange={setAbaAtiva}
        />

        <div className="mt-5">
          <DetalhesEquipamentoTabContent
            abaAtiva={abaAtiva}
            equipamento={equipamento}
            equipamentoId={equipamentoId}
            onRefresh={refetchEquipamento}
          />
        </div>
      </PageSection>
    </PageLayout>
  );
}

export default DetalhesEquipamentoPage;