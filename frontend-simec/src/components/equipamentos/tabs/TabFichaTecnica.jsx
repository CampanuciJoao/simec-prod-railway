import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileMedical, faRotateLeft } from '@fortawesome/free-solid-svg-icons';

import { Button, LoadingState } from '@/components/ui';
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
      <div
        className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-4"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface-soft)',
        }}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faFileMedical} />
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Ficha tecnica do ativo
            </p>
            <p
              className="text-sm leading-6"
              style={{ color: 'var(--text-muted)' }}
            >
              Registre ocorrencias e eventos operacionais leves. Todos os
              registros continuam alimentando o historico unico do equipamento.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={fichaTecnica.handleResetNovoEvento}
          disabled={fichaTecnica.submitting}
        >
          <FontAwesomeIcon icon={faRotateLeft} />
          Limpar formulario
        </Button>
      </div>

      <FichaTecnicaEventForm
        novoEvento={fichaTecnica.novoEvento}
        submitting={fichaTecnica.submitting}
        onChange={fichaTecnica.handleEventoChange}
        onSubmit={fichaTecnica.handleSubmitEvento}
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
