import React from 'react';
import PropTypes from 'prop-types';

function ContratoEquipamentosList({ equipamentos = [] }) {
  if (!equipamentos.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Sem equipamentos específicos.
      </div>
    );
  }

  return (
    <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
      {equipamentos.map((equipamento) => (
        <div
          key={equipamento.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span className="text-sm font-medium text-slate-800">
            {equipamento.modelo}
          </span>

          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {equipamento.tag || 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
}

ContratoEquipamentosList.propTypes = {
  equipamentos: PropTypes.array,
};

export default ContratoEquipamentosList;