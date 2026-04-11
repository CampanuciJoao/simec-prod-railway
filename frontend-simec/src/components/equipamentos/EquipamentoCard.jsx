import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
  faFileMedical,
} from '@fortawesome/free-solid-svg-icons';

import StatusSelector from '../ui/StatusSelector';
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
      className={[
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all',
        'border-l-[10px]',
        borderClass,
      ].join(' ')}
    >
      <div
        className={[
          'flex cursor-pointer flex-col gap-4 p-4 transition-colors md:flex-row md:items-center md:justify-between',
          'hover:bg-slate-50',
          backgroundClass,
        ].join(' ')}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpandir(equipamento.id);
        }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4 md:items-center md:gap-6">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm">
            <FontAwesomeIcon icon={isAberto ? faMinus : faPlus} />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Modelo
              </span>
              <span className="mt-1 truncate text-sm font-bold uppercase text-slate-800">
                {equipamento.modelo || '—'}
              </span>
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Nº Série / Tag
              </span>
              <span className="mt-1 truncate text-sm font-bold italic text-slate-800">
                {equipamento.tag || '—'}
              </span>
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Tipo
              </span>
              <span className="mt-1 truncate text-sm font-semibold text-slate-800">
                {equipamento.tipo || '—'}
              </span>
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Unidade
              </span>
              <span className="mt-1 truncate text-sm font-semibold text-slate-800">
                {equipamento.unidade?.nomeSistema || '—'}
              </span>
            </div>

            <div
              className="flex min-w-0 flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
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
          className="flex shrink-0 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
            title="Abrir ficha técnica"
            onClick={() => onGoToFichaTecnica(equipamento.id)}
          >
            <FontAwesomeIcon icon={faFileMedical} />
          </button>
        </div>
      </div>

      {isAberto && (
        <div className="border-t border-slate-200 bg-white">
          <EquipamentoCardExpanded
            equipamento={equipamento}
            abaAtiva={abaAtiva}
            onChangeTab={onTrocarAba}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

export default EquipamentoCard;