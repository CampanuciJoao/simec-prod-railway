import React from 'react';
import PropTypes from 'prop-types';

import { EntityCard } from '@/components/ui';
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
        className="truncate text-base"
        title={value || '-'}
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
  onStatusUpdated,
  onRefresh,
}) {
  const { cardStyle, toggleStyle, expandedStyle } =
    getEquipamentoCardStyles(equipamento.status);

  const handleToggle = () => onToggleExpandir(equipamento.id);

  return (
    <EntityCard
      compact
      expanded={isAberto}
      onToggle={handleToggle}
      cardStyle={cardStyle}
      toggleStyle={toggleStyle}
      expandedStyle={expandedStyle}
      summary={
        <div className="grid w-full items-center gap-x-5 md:grid-cols-[minmax(0,1.05fr)_minmax(110px,0.8fr)_minmax(0,1.3fr)_minmax(0,0.85fr)_minmax(0,0.9fr)_160px] lg:gap-x-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(120px,0.85fr)_minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,0.95fr)_170px] xl:gap-x-8">
          <Col label="Modelo" value={equipamento.modelo} bold />
          <Col label="Nº Série / Tag" value={equipamento.tag} />
          <Col label="Tipo" value={equipamento.tipo} />
          <Col label="Fabricante" value={equipamento.fabricante} />
          <Col label="Unidade" value={equipamento.unidade?.nomeSistema} />

          <div className="flex min-w-0 flex-col gap-0.5">
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
  onStatusUpdated: PropTypes.func,
  onRefresh: PropTypes.func,
};

export default EquipamentoCard;
