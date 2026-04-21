import React from 'react';
import { faMicrochip } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesEquipamentoPage } from '@/hooks/equipamentos/useDetalhesEquipamentoPage';
import {
  DetalhesEquipamentoTabContent,
  DetalhesEquipamentoTabs,
} from '@/components/equipamentos';

import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  PageLayout,
} from '@/components/ui';

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

  const handleBack = () => {
    window.history.back();
  };

  const backAction = (
    <Button type="button" variant="secondary" onClick={handleBack}>
      Voltar
    </Button>
  );

  if (loading) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title="Detalhes do Equipamento"
            icon={faMicrochip}
            actions={backAction}
          />

          <LoadingState message="Carregando equipamento..." />
        </div>
      </PageLayout>
    );
  }

  if (error || !equipamento) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title="Detalhes do Equipamento"
            icon={faMicrochip}
            actions={backAction}
          />

          <EmptyState
            message={error || 'O equipamento solicitado não foi encontrado.'}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title={`Detalhes do Equipamento: ${equipamento.modelo}`}
          subtitle={`Tag: ${equipamento.tag || 'N/A'}`}
          icon={faMicrochip}
          actions={backAction}
        />

        <DetalhesEquipamentoTabs
          abas={abas}
          abaAtiva={abaAtiva}
          onChange={setAbaAtiva}
        />

        <DetalhesEquipamentoTabContent
          abaAtiva={abaAtiva}
          equipamento={equipamento}
          equipamentoId={equipamentoId}
          onRefresh={refetchEquipamento}
          onChangeTab={setAbaAtiva}
        />
      </div>
    </PageLayout>
  );
}

export default DetalhesEquipamentoPage;
