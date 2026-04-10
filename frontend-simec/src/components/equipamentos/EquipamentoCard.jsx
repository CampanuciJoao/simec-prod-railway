import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
  faMinusCircle,
  faFileMedical
} from '@fortawesome/free-solid-svg-icons';

import StatusSelector from '../StatusSelector';
import EquipamentoCardExpanded from './EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '../../utils/equipamentoCardStyles';

function EquipamentoCard({
  equipamento,
  isAberto,
  abaAtiva,
  onToggleExpandir,
  onTrocarAba,
  onGoToFichaTecnica,
  onStatusUpdated,
  onRefresh,
}) {
  const { borderClass, backgroundClass } = getEquipamentoCardStyles(equipamento.status);

  return (
    <div
      className={`bg-white border-y border-r border-slate-200 border-l-[10px] ${borderClass} rounded-xl shadow-sm transition-all mb-2`}
    >
      <div
        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors ${backgroundClass}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpandir(equipamento.id);
        }}
      >
        <div className="flex items-center gap-6 flex-1">
          <div className="bg-white text-[#3b82f6] rounded-full w-8 h-8 flex items-center justify-center shadow-sm shrink-0 border border-blue-100">
            <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                Modelo
              </span>
              <span className="font-bold text-slate-800 text-[14px] uppercase leading-none mt-1">
                {equipamento.modelo}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                Nº Série / Tag
              </span>
              <span className="font-bold text-slate-800 text-[14px] italic leading-none mt-1">
                {equipamento.tag}
              </span>
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                Tipo
              </span>
              <span className="font-bold text-slate-800 text-[14px] leading-none mt-1">
                {equipamento.tipo}
              </span>
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                Unidade
              </span>
              <span className="font-bold text-slate-800 text-[14px] leading-none mt-1 truncate">
                {equipamento.unidade?.nomeSistema || '—'}
              </span>
            </div>

            <div
              className="flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">
                Status Atual
              </span>
              <StatusSelector
                equipamento={equipamento}
                onSuccessUpdate={onStatusUpdated}
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-2 ml-4 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 cursor-pointer"
            title="Ficha Técnica"
            onClick={() => onGoToFichaTecnica(equipamento.id)}
          >
            <FontAwesomeIcon icon={faFileMedical} />
          </button>
        </div>
      </div>

      {isAberto && (
        <EquipamentoCardExpanded
          equipamento={equipamento}
          abaAtiva={abaAtiva}
          onChangeTab={onTrocarAba}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

export default EquipamentoCard;