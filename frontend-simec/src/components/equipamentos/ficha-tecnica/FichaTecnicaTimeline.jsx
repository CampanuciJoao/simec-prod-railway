import React from 'react';
import PropTypes from 'prop-types';

import PageSection from '@/components/ui/layout/PageSection';
import PageState from '@/components/ui/feedback/PageState';
import FichaTecnicaTimelineItem from '@/components/equipamentos/ficha-tecnica/FichaTecnicaTimelineItem';

function FichaTecnicaTimeline({
  ocorrencias,
  itensExpandidos,
  dadosSolucao,
  resolvendoId,
  submitting,
  onToggleExpandir,
  onChangeSolucao,
  onAbrirResolucao,
  onCancelarResolucao,
  onSalvarSolucao,
}) {
  return (
    <PageSection
      title={`Histórico operacional (${ocorrencias.length})`}
      description="Linha do tempo de eventos técnicos e operacionais do equipamento."
    >
      {ocorrencias.length === 0 ? (
        <PageState
          isEmpty
          emptyMessage="Nenhum evento registrado para este equipamento."
        />
      ) : (
        <div className="space-y-4">
          {ocorrencias.map((item) => {
            const expandido = itensExpandidos.has(item.id);
            const payloadSolucao = dadosSolucao[item.id] || {};

            return (
              <FichaTecnicaTimelineItem
                key={item.id}
                item={item}
                expandido={expandido}
                payloadSolucao={payloadSolucao}
                isResolvendo={resolvendoId === item.id}
                submitting={submitting}
                onToggle={() => onToggleExpandir(item.id)}
                onChangeSolucao={(campo, valor) =>
                  onChangeSolucao(item.id, campo, valor)
                }
                onAbrirResolucao={() => onAbrirResolucao(item.id)}
                onCancelarResolucao={onCancelarResolucao}
                onSalvarSolucao={() => onSalvarSolucao(item.id)}
              />
            );
          })}
        </div>
      )}
    </PageSection>
  );
}

FichaTecnicaTimeline.propTypes = {
  ocorrencias: PropTypes.arrayOf(PropTypes.object).isRequired,
  itensExpandidos: PropTypes.instanceOf(Set).isRequired,
  dadosSolucao: PropTypes.object.isRequired,
  resolvendoId: PropTypes.string,
  submitting: PropTypes.bool.isRequired,
  onToggleExpandir: PropTypes.func.isRequired,
  onChangeSolucao: PropTypes.func.isRequired,
  onAbrirResolucao: PropTypes.func.isRequired,
  onCancelarResolucao: PropTypes.func.isRequired,
  onSalvarSolucao: PropTypes.func.isRequired,
};

export default FichaTecnicaTimeline;