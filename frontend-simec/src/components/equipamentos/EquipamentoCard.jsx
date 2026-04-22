import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faFileMedical,
  faIndustry,
  faMicrochip,
  faTag,
} from '@fortawesome/free-solid-svg-icons';

import { Badge, Button, EntityCard, StatusBadge } from '@/components/ui';
import { StatusSelector } from '@/components/equipamentos';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

function MetaField({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <span
        className="flex items-center gap-1.5 text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        <FontAwesomeIcon
          icon={icon}
          className="shrink-0 text-xs"
          style={{ color: 'var(--text-muted)' }}
        />
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
  const { cardStyle, toggleStyle, expandedStyle, infoCardStyle } =
    getEquipamentoCardStyles(equipamento.status);

  const handleToggle = () => {
    onToggleExpandir(equipamento.id);
  };

  const handleGoToFicha = (event) => {
    event.stopPropagation();
    onGoToFichaTecnica(equipamento.id);
  };

  return (
    <EntityCard
      compact
      expanded={isAberto}
      onToggle={handleToggle}
      cardStyle={cardStyle}
      toggleStyle={toggleStyle}
      expandedStyle={expandedStyle}
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          title="Abrir ficha tecnica"
          onClick={handleGoToFicha}
          className="px-3 sm:px-4"
          style={{
            '--button-bg': 'var(--bg-surface)',
            '--button-bg-hover': 'var(--bg-hover)',
            '--button-text': 'var(--text-primary)',
            '--button-border': 'var(--border-soft)',
          }}
        >
          <FontAwesomeIcon icon={faFileMedical} />
          <span className="hidden sm:inline">Ficha tecnica</span>
        </Button>
      }
      summary={
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={equipamento.status || 'N/A'} />
              {equipamento.tipo && (
                <Badge variant="outline">
                  <FontAwesomeIcon icon={faMicrochip} className="text-xs" />
                  {equipamento.tipo}
                </Badge>
              )}
            </div>

            <h3
              className="mt-2 break-words text-lg font-bold sm:text-xl"
              style={{ color: 'var(--text-primary)' }}
            >
              {equipamento.modelo}
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <MetaField
                icon={faTag}
                label="Nº de Série"
                value={equipamento.tag}
              />
              <MetaField
                icon={faBuilding}
                label="Unidade"
                value={equipamento.unidade?.nomeSistema}
              />
              <MetaField
                icon={faIndustry}
                label="Fabricante"
                value={equipamento.fabricante}
              />
            </div>
          </div>

          <div
            className="w-full rounded-2xl border px-3 py-3 xl:w-auto xl:min-w-[200px]"
            style={infoCardStyle}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Alterar status
            </div>
            <div className="mt-2">
              <StatusSelector
                equipamento={equipamento}
                onSuccessUpdate={onStatusUpdated}
              />
            </div>
          </div>
        </div>
      }
      expandedContent={
        <EquipamentoCardExpanded
          equipamento={equipamento}
          abaAtiva={abaAtiva}
          onChangeTab={onTrocarAba}
          onRefresh={onRefresh}
        />
      }
    />
  );
}

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
