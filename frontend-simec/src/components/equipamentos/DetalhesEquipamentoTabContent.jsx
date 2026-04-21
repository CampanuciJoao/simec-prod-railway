import React from 'react';

import {
  TabAnexos,
  TabCobertura,
  TabFichaTecnica,
  TabHistorico,
  TabVisaoGeral,
} from '@/components/equipamentos/tabs';

function DetalhesEquipamentoTabContent({
  abaAtiva,
  equipamento,
  equipamentoId,
  onRefresh,
  onChangeTab,
}) {
  const tabContentMap = {
    visaoGeral: (
      <TabVisaoGeral
        equipamento={equipamento}
        editHref={`/cadastros/equipamentos/editar/${equipamentoId}`}
      />
    ),
    fichaTecnica: <TabFichaTecnica equipamentoId={equipamentoId} />,
    anexos: (
      <TabAnexos
        equipamentoId={equipamentoId}
        anexosIniciais={equipamento?.anexos || []}
        onUpdate={onRefresh}
      />
    ),
    historico: <TabHistorico equipamento={equipamento} />,
    cobertura: <TabCobertura equipamento={equipamento} />,
  };

  return tabContentMap[abaAtiva] || null;
}

export default DetalhesEquipamentoTabContent;
