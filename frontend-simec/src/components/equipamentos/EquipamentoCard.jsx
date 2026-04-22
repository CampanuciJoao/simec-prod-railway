import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileMedical } from '@fortawesome/free-solid-svg-icons';

import { EntityCard } from '@/components/ui';
import { StatusSelector } from '@/components/equipamentos';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

function Col({ label, value, bold = false }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
        <button
          type="button"
          title="Abrir ficha tecnica"
          onClick={handleGoToFicha}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm transition-all hover:-translate-y-[1px]"
          style={toggleStyle}
        >
          <FontAwesomeIcon icon={faFileMedical} />
        </button>
      }
      summary={
        <div className="flex w-full items-start gap-4">
          <Col label="Modelo" value={equipamento.modelo} bold />
          <Col label="Nº Série / Tag" value={equipamento.tag} />
          <Col label="Tipo" value={equipamento.tipo} />
          <Col label="Unidade" value={equipamento.unidade?.nomeSistema} />

          <div className="flex w-[180px] shrink-0 flex-col gap-0.5">
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
