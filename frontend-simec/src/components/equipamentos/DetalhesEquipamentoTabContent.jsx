import React from 'react';

import {
  TabAcessorios,
  TabAnexos,
  TabCadastro,
  TabHistorico,
} from '@/components/equipamentos/tabs';

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

  return tabContentMap[abaAtiva] || null;
}

export default DetalhesEquipamentoTabContent;