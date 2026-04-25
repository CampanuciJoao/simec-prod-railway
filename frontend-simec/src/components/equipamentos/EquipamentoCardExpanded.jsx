import React from 'react';
import PropTypes from 'prop-types';

import { ResponsiveTabs } from '@/components/ui';
import {
  TabAnexos,
  TabCobertura,
  TabFichaTecnica,
  TabHistorico,
  TabVisaoGeral,
} from '@/components/equipamentos/tabs';

const TABS = [
  { id: 'visaoGeral', label: 'Visao geral' },
  { id: 'historico', label: 'Historico' },
  { id: 'fichaTecnica', label: 'Ficha tecnica' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'cobertura', label: 'Cobertura' },
];

function EquipamentoCardExpanded({
  equipamento,
  abaAtiva,
  onChangeTab,
  onRefresh,
}) {
  const tabContentMap = {
    visaoGeral: (
      <TabVisaoGeral
        equipamento={equipamento}
        editHref={`/equipamentos/editar/${equipamento.id}`}
      />
    ),
    fichaTecnica: <TabFichaTecnica equipamentoId={equipamento.id} />,
    anexos: (
      <TabAnexos
        equipamentoId={equipamento.id}
        anexosIniciais={equipamento.anexos || []}
        onUpdate={onRefresh}
      />
    ),
    historico: <TabHistorico equipamento={equipamento} />,
    cobertura: <TabCobertura equipamento={equipamento} />,
  };

  return (
    <div
      className="space-y-5 border-t px-4 py-5 md:px-6 md:py-6"
      style={{
        borderColor: 'var(--section-header-border)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <ResponsiveTabs
        tabs={TABS}
        activeTab={abaAtiva}
        onChange={(tabId) => onChangeTab(equipamento.id, tabId)}
      />

      <div
        className="min-h-[260px] rounded-3xl border p-4 md:p-5"
        style={{
          backgroundColor: 'var(--bg-surface-soft)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
        }}
      >
        {tabContentMap[abaAtiva] || null}
      </div>
    </div>
  );
}

EquipamentoCardExpanded.propTypes = {
  equipamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    anexos: PropTypes.array,
  }).isRequired,
  abaAtiva: PropTypes.string.isRequired,
  onChangeTab: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
};

export default EquipamentoCardExpanded;
