import React from 'react';

import TabCadastro from '@/components/equipamentos/tabs/TabCadastro';
import TabAcessorios from '@/components/equipamentos/tabs/TabAcessorios';
import TabAnexos from '@/components/equipamentos/tabs/TabAnexos';
import TabHistorico from '@/components/equipamentos/tabs/TabHistorico';

function DetalhesEquipamentoTabContent({
  abaAtiva,
  equipamento,
  equipamentoId,
  onRefresh,
}) {
  const tabContentMap = {
    cadastro: (
      <TabCadastro
        equipamentoInicial={equipamento}
        onUpdate={onRefresh}
      />
    ),
    acessorios: <TabAcessorios equipamentoId={equipamentoId} />,
    anexos: (
      <TabAnexos
        equipamentoId={equipamentoId}
        anexosIniciais={equipamento?.anexos || []}
        onUpdate={onRefresh}
      />
    ),
    historico: <TabHistorico equipamento={equipamento} />,
  };

  return <>{tabContentMap[abaAtiva] || null}</>;
}

export default DetalhesEquipamentoTabContent;