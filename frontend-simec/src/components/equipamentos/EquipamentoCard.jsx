import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faFileMedical,
  faIndustry,
  faMicrochip,
  faShieldHeart,
  faTag,
} from '@fortawesome/free-solid-svg-icons';

import { Badge, Button, EntityCard, StatusBadge } from '@/components/ui';
import { StatusSelector } from '@/components/equipamentos';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

function MetaField({ icon, label, value }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <span
        className="mt-2 flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        <FontAwesomeIcon
          icon={icon}
          className="shrink-0 text-xs"
          style={{ color: 'var(--text-muted)' }}
        />
        {value || '-'}
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
            '--button-bg': 'var(--bg-surface-soft)',
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
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex items-center rounded-full"
                style={{ backgroundColor: 'var(--bg-surface-soft)' }}
              >
                <StatusBadge value={equipamento.status || 'N/A'} />
              </div>

              {equipamento.tipo ? (
                <Badge variant="outline" className="gap-1.5">
                  <FontAwesomeIcon icon={faMicrochip} className="text-xs" />
                  {equipamento.tipo}
                </Badge>
              ) : null}
            </div>

            <div className="mt-3 space-y-1.5">
              <h3
                className="break-words text-[1.65rem] font-bold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {equipamento.modelo}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Visao rapida do ativo com identificacao, localizacao e fabricante.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetaField
                icon={faTag}
                label="Tag / Serie"
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
            className="w-full rounded-3xl border px-4 py-4 xl:w-auto xl:min-w-[240px]"
            style={infoCardStyle}
          >
            <div className="flex items-start gap-3">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              >
                <FontAwesomeIcon icon={faShieldHeart} />
              </span>

              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Status operacional
                </div>
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Atualize o estado atual do equipamento.
                </p>
              </div>
            </div>

            <div className="mt-3">
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
    fabricante: PropTypes.string,
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
