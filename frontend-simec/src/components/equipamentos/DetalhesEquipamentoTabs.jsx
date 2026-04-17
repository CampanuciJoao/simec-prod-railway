import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { ResponsiveTabs } from '@/components/ui';

function DetalhesEquipamentoTabs({
  abas = [],
  abaAtiva,
  onChange,
  className = '',
}) {
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
      className={className}
    />
  );
}

DetalhesEquipamentoTabs.propTypes = {
  abas: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.any,
    })
  ),
  abaAtiva: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default DetalhesEquipamentoTabs;