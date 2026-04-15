import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
  faFileMedical,
} from '@fortawesome/free-solid-svg-icons';

import StatusSelector from '@/components/ui/filters/StatusSelector';
import Button from '@/components/ui/primitives/Button';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

function InfoField({ label, value, valueClassName = '' }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span
        className={[
          'mt-1 truncate text-sm text-slate-800',
          valueClassName,
        ].join(' ')}
      >
        {value || '—'}
      </span>
    </div>
  );
}

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
  const { borderClass, backgroundClass } = getEquipamentoCardStyles(
    equipamento.status
  );

  const handleToggle = () => {
    onToggleExpandir(equipamento.id);
  };

  const handleGoToFicha = (event) => {
    event.stopPropagation();
    onGoToFichaTecnica(equipamento.id);
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all',
        'border-l-[10px]',
        borderClass,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={[
          'flex w-full flex-col gap-4 p-4 text-left transition-colors md:flex-row md:items-center md:justify-between',
          'hover:bg-slate-50',
          backgroundClass,
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4 md:items-center md:gap-6">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm">
            <FontAwesomeIcon icon={isAberto ? faMinus : faPlus} />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <InfoField
              label="Modelo"
              value={equipamento.modelo}
              valueClassName="font-bold uppercase"
            />

            <InfoField
              label="Nº Série / Tag"
              value={equipamento.tag}
              valueClassName="font-bold italic"
            />

            <InfoField
              label="Tipo"
              value={equipamento.tipo}
              valueClassName="font-semibold"
            />

            <InfoField
              label="Unidade"
              value={equipamento.unidade?.nomeSistema}
              valueClassName="font-semibold"
            />

            <div className="flex min-w-0 flex-col" onClick={stopPropagation}>
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
          onClick={stopPropagation}
        >
          <Button
            type="button"
            variant="ghost"
            className="border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
            title="Abrir ficha técnica"
            onClick={handleGoToFicha}
          >
            <FontAwesomeIcon icon={faFileMedical} />
          </Button>
        </div>
      </button>

      {isAberto ? (
        <div className="border-t border-slate-200 bg-white">
          <EquipamentoCardExpanded
            equipamento={equipamento}
            abaAtiva={abaAtiva}
            onChangeTab={onTrocarAba}
            onRefresh={onRefresh}
          />
        </div>
      ) : null}
    </div>
  );
}

InfoField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  valueClassName: PropTypes.string,
};

EquipamentoCard.propTypes = {
  equipamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    modelo: PropTypes.string,
    tag: PropTypes.string,
    tipo: PropTypes.string,
    status: PropTypes.string,
    unidade: PropTypes.shape({
      nomeSistema: PropTypes.string,
    }),
  }).isRequired,
  isAberto: PropTypes.bool.isRequired,
  abaAtiva: PropTypes.string,
  onToggleExpandir: PropTypes.func.isRequired,
  onTrocarAba: PropTypes.func.isRequired,
  onGoToFichaTecnica: PropTypes.func.isRequired,
  onStatusUpdated: PropTypes.func,
  onRefresh: PropTypes.func,
};

export default EquipamentoCard;