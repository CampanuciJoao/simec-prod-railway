import React from 'react';
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
    <div className="bg-white border-t border-slate-200 p-8">
      <div className="flex gap-8 mb-6 border-b border-slate-100 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`bg-transparent border-none cursor-pointer font-black text-xs uppercase tracking-widest pb-2 transition-all ${
              abaAtiva === tab.id
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-slate-400'
            }`}
            onClick={() => onChangeTab(equipamento.id, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[200px] text-slate-900">
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