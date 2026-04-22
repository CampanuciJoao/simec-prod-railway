import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileMedical } from '@fortawesome/free-solid-svg-icons';

import { Button, EntityCard } from '@/components/ui';
import { StatusSelector } from '@/components/equipamentos';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

function Col({ label, value, bold = false }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <span
        className="truncate text-sm"
        style={{
          color: 'var(--text-primary)',
          fontWeight: bold ? 700 : 600,
        }}
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
  const { cardStyle, toggleStyle, expandedStyle } =
    getEquipamentoCardStyles(equipamento.status);

  const handleToggle = () => onToggleExpandir(equipamento.id);

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
          style={{
            '--button-bg': 'var(--bg-surface)',
            '--button-bg-hover': 'var(--bg-hover)',
            '--button-text': 'var(--text-primary)',
            '--button-border': 'var(--border-soft)',
          }}
        >
          <FontAwesomeIcon icon={faFileMedical} />
        </Button>
      }
      summary={
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <Col label="Modelo" value={equipamento.modelo} bold />
          <Col label="Nº Série / Tag" value={equipamento.tag} />
          <Col label="Tipo" value={equipamento.tipo} />
          <Col label="Unidade" value={equipamento.unidade?.nomeSistema} />

          <div className="ml-auto flex flex-col gap-0.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Status atual
            </span>
            <StatusSelector
              equipamento={equipamento}
              onSuccessUpdate={onStatusUpdated}
            />
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
