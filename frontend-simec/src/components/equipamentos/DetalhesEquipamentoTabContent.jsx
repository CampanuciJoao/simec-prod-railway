import React from 'react';

import {
  TabAnexos,
  TabCobertura,
  TabHistorico,
  TabVisaoGeral,
} from '@/components/equipamentos/tabs';

function DetalhesEquipamentoTabContent({
  abaAtiva,
  equipamento,
  equipamentoId,
  onRefresh,
}) {
  const tabContentMap = {
    visaoGeral: (
      <TabVisaoGeral
        equipamento={equipamento}
        editHref={`/equipamentos/editar/${equipamentoId}`}
      />
    ),
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
