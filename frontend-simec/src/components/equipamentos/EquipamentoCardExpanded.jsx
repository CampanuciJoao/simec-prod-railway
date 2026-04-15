import React from 'react';
import PropTypes from 'prop-types';

import { ResponsiveTabs } from '@/components/ui/layout';

import TabCadastro from '@/components/equipamentos/tabs/TabCadastro';
import TabAcessorios from '@/components/equipamentos/tabs/TabAcessorios';
import TabAnexos from '@/components/equipamentos/tabs/TabAnexos';
import TabHistorico from '@/components/equipamentos/tabs/TabHistorico';

const TABS = [
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'historico', label: 'Histórico' },
];

function EquipamentoCardExpanded({
  equipamento,
  abaAtiva,
  onChangeTab,
  onRefresh,
}) {
  const tabContentMap = {
    cadastro: <TabCadastro equipamentoInicial={equipamento} />,
    acessorios: <TabAcessorios equipamentoId={equipamento.id} />,
    anexos: (
      <TabAnexos
        equipamentoId={equipamento.id}
        anexosIniciais={equipamento.anexos || []}
        onUpdate={onRefresh}
      />
    ),
    historico: <TabHistorico equipamento={equipamento} />,
  };

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-5 md:px-6 md:py-6">
      <div className="mb-6">
        <ResponsiveTabs
          tabs={TABS}
          activeTab={abaAtiva}
          onChange={(tabId) => onChangeTab(equipamento.id, tabId)}
        />
      </div>

      <div className="min-h-[220px] rounded-2xl border border-slate-100 bg-slate-50/40 p-4 text-slate-900 md:p-5">
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