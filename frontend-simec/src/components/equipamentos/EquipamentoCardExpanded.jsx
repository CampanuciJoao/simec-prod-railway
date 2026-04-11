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
    <div className="border-t border-slate-200 bg-white px-4 py-5 md:px-6 md:py-6">
      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 border-b border-slate-200 pb-2">
          {TABS.map((tab) => {
            const isActive = abaAtiva === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(equipamento.id, tab.id)}
                className={[
                  'inline-flex items-center whitespace-nowrap rounded-t-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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