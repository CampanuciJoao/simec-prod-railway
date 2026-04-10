import React from 'react';
import TabCadastro from './tabs/TabCadastro';
import TabAcessorios from './tabs/TabAcessorios';
import TabAnexos from './tabs/TabAnexos';
import TabHistorico from './tabs/TabHistorico';

function DetalhesEquipamentoTabContent({
  abaAtiva,
  equipamento,
  equipamentoId,
  onRefresh,
}) {
  return (
    <div className="tab-content">
      {abaAtiva === 'detalhes' && (
        <TabCadastro
          equipamentoInicial={equipamento}
          onUpdate={onRefresh}
        />
      )}

      {abaAtiva === 'acessorios' && (
        <TabAcessorios equipamentoId={equipamentoId} />
      )}

      {abaAtiva === 'anexos' && (
        <TabAnexos
          equipamentoId={equipamentoId}
          anexosIniciais={equipamento?.anexos || []}
          onUpdate={onRefresh}
        />
      )}

      {abaAtiva === 'historico' && (
        <TabHistorico equipamento={equipamento} />
      )}
    </div>
  );
}

export default DetalhesEquipamentoTabContent;