import React from 'react';
import { ResponsiveTabs } from '../ui/layout';

import TabCadastro from './tabs/TabCadastro';
import TabAcessorios from './tabs/TabAcessorios';
import TabAnexos from './tabs/TabAnexos';
import TabHistorico from './tabs/TabHistorico';

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
        {abaAtiva === 'cadastro' && (
          <TabCadastro equipamentoInicial={equipamento} />
        )}

        {abaAtiva === 'acessorios' && (
          <TabAcessorios equipamentoId={equipamento.id} />
        )}

        {abaAtiva === 'anexos' && (
          <TabAnexos
            equipamentoId={equipamento.id}
            anexosIniciais={equipamento.anexos || []}
            onUpdate={onRefresh}
          />
        )}

        {abaAtiva === 'historico' && (
          <TabHistorico equipamento={equipamento} />
        )}
      </div>
    </div>
  );
}

export default EquipamentoCardExpanded;