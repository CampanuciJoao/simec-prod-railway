import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ResponsiveTabs } from '../ui/layout';

function DetalhesEquipamentoTabs({ abas, abaAtiva, onChange }) {
  const tabs = abas.map((aba) => ({
    id: aba.id,
    label: aba.label,
    icon: aba.icon ? <FontAwesomeIcon icon={aba.icon} /> : null,
  }));

  return (
    <ResponsiveTabs
      tabs={tabs}
      activeTab={abaAtiva}
      onChange={onChange}
    />
  );
}

export default DetalhesEquipamentoTabs;