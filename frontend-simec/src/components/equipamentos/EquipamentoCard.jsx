import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faFileMedical,
  faMicrochip,
  faTag,
} from '@fortawesome/free-solid-svg-icons';

import { Badge, Button, EntityCard, StatusBadge } from '@/components/ui';
import { StatusSelector } from '@/components/equipamentos';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="slate">
                <FontAwesomeIcon icon={faMicrochip} className="mr-1" />
                Ativo
              </Badge>
              <StatusBadge value={equipamento.status || 'N/A'} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3
                className="break-words text-lg font-bold sm:text-xl"
                style={{ color: 'var(--text-primary)' }}
              >
                {equipamento.modelo}
              </h3>

              <div
                className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faTag} className="text-xs" />
                  {equipamento.tag || 'Sem tag'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faBuilding} className="text-xs" />
                  {equipamento.unidade?.nomeSistema || 'Sem unidade'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faMicrochip} className="text-xs" />
                  {equipamento.tipo || 'Sem tipo'}
                </span>
              </div>
            </div>

            <div
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>Fabricante: {equipamento.fabricante || 'N/A'}</span>
              <span>Patrimonio: {equipamento.numeroPatrimonio || 'N/A'}</span>
            </div>
          </div>

          <div
            className="w-full rounded-2xl border px-3 py-3 xl:w-auto xl:min-w-[250px]"
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
