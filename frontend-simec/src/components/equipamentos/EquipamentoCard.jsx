import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileMedical } from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  EntityCard,
  EntityInfoGrid,
} from '@/components/ui';
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
  const { borderClass } = getEquipamentoCardStyles(equipamento.status);

  const handleToggle = () => {
    onToggleExpandir(equipamento.id);
  };

  const handleGoToFicha = (event) => {
    event.stopPropagation();
    onGoToFichaTecnica(equipamento.id);
  };

  const summaryItems = [
    {
      key: 'modelo',
      label: 'Modelo',
      value: equipamento.modelo,
    },
    {
      key: 'tag',
      label: 'Nº Série / Tag',
      value: equipamento.tag,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      value: equipamento.tipo,
    },
    {
      key: 'unidade',
      label: 'Unidade',
      value: equipamento.unidade?.nomeSistema,
    },
    {
      key: 'status',
      label: 'Status atual',
      value: (
        <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
          <StatusSelector
            equipamento={equipamento}
            onSuccessUpdate={onStatusUpdated}
          />
        </div>
      ),
    },
  ];

  return (
    <EntityCard
      title={equipamento.modelo || 'Equipamento sem modelo'}
      eyebrow="Equipamento"
      subtitle={`Clique para ${isAberto ? 'recolher' : 'expandir'} os detalhes`}
      expanded={isAberto}
      onToggle={handleToggle}
      borderClassName={borderClass}
      actions={
        <Button
          type="button"
          variant="secondary"
          title="Abrir ficha técnica"
          onClick={handleGoToFicha}
        >
          <FontAwesomeIcon icon={faFileMedical} />
          <span className="hidden sm:inline">Ficha técnica</span>
        </Button>
      }
      summary={<EntityInfoGrid items={summaryItems} />}
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