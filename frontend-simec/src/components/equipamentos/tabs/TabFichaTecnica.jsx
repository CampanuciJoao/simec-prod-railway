import React from 'react';
import PropTypes from 'prop-types';

import { LoadingState } from '@/components/ui';
import {
  FichaTecnicaEventForm,
  FichaTecnicaTimeline,
} from '@/components/equipamentos/ficha-tecnica';
import { useEquipamentoFichaTecnica } from '@/hooks/equipamentos/useEquipamentoFichaTecnica';

function TabFichaTecnica({ equipamentoId }) {
  const fichaTecnica = useEquipamentoFichaTecnica(equipamentoId);

  if (fichaTecnica.loading) {
    return <LoadingState message="Carregando ficha tecnica..." />;
  }

  return (
    <div className="space-y-6">
      <FichaTecnicaEventForm
        novoEvento={fichaTecnica.novoEvento}
        submitting={fichaTecnica.submitting}
        onChange={fichaTecnica.handleEventoChange}
        onSubmit={fichaTecnica.handleSubmitEvento}
        onLimpar={fichaTecnica.handleResetNovoEvento}
      />

      <FichaTecnicaTimeline
        ocorrencias={fichaTecnica.ocorrencias}
        itensExpandidos={fichaTecnica.itensExpandidos}
        dadosSolucao={fichaTecnica.dadosSolucao}
        resolvendoId={fichaTecnica.resolvendoId}
        submitting={fichaTecnica.submitting}
        onToggleExpandir={fichaTecnica.toggleExpandir}
        onChangeSolucao={fichaTecnica.handleSolucaoChange}
        onAbrirResolucao={fichaTecnica.handleAbrirResolucao}
        onCancelarResolucao={fichaTecnica.handleCancelarResolucao}
        onSalvarSolucao={fichaTecnica.handleSalvarSolucao}
      />
    </div>
  );
}

TabFichaTecnica.propTypes = {
  equipamentoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
};

export default TabFichaTecnica;
