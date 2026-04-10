import React from 'react';
import { faArrowLeft, faMicrochip } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesEquipamentoPage } from '../../hooks/equipamentos/useDetalhesEquipamentoPage';
import DetalhesEquipamentoTabs from '../../components/equipamentos/DetalhesEquipamentoTabs';
import DetalhesEquipamentoTabContent from '../../components/equipamentos/DetalhesEquipamentoTabContent';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';

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

  const showState = loading || !!error || !equipamento;

  if (showState) {
    return (
      <div className="page-content-wrapper">
        <PageHeader
          title={equipamento?.modelo ? `Detalhes do Equipamento: ${equipamento.modelo}` : 'Detalhes do Equipamento'}
          icon={faMicrochip}
          actions={
            <button className="btn btn-secondary" onClick={() => window.history.back()}>
              Voltar
            </button>
          }
          variant="light"
        />

        <PageState
          loading={loading}
          error={error}
          isEmpty={!loading && !error && !equipamento}
          emptyMessage="O equipamento solicitado não foi encontrado."
        />
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <PageHeader
        title={`Detalhes do Equipamento: ${equipamento.modelo}`}
        icon={faMicrochip}
        actions={
          <button className="btn btn-secondary" onClick={() => window.history.back()}>
            Voltar
          </button>
        }
        variant="light"
      />

      <section className="page-section">
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
        />
      </section>
    </div>
  );
}

export default DetalhesEquipamentoPage;