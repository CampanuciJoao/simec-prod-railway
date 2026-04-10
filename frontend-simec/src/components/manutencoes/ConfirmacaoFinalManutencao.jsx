import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

function ConfirmacaoFinalManutencao({
  visible,
  confirmMode,
  setConfirmMode,
  dataTerminoReal,
  setDataTerminoReal,
  novaPrevisao,
  setNovaPrevisao,
  observacaoDecisao,
  setObservacaoDecisao,
  onConfirm,
  submitting,
}) {
  if (!visible) return null;

  return (
    <section
      className="page-section no-print"
      style={{ borderColor: '#F59E0B', background: '#fefce8', borderWidth: '2px' }}
    >
      <h3 style={{ color: '#B45309' }}>Ação Necessária: Confirmar Finalização</h3>
      <p>
        O tempo agendado para esta manutenção expirou. Registre o resultado para atualizar o sistema:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className={`btn ${confirmMode === 'OK' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setConfirmMode('OK')}
          >
            <FontAwesomeIcon icon={faCheckCircle} /> Equipamento Operante
          </button>

          <button
            type="button"
            className={`btn ${confirmMode === 'ERRO' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setConfirmMode('ERRO')}
          >
            <FontAwesomeIcon icon={faTimesCircle} /> Continua Inoperante
          </button>
        </div>

        {confirmMode === 'OK' && (
          <div className="form-group" style={{ maxWidth: '400px' }}>
            <label>Data e Hora real da conclusão: *</label>
            <input
              type="datetime-local"
              className="form-control"
              value={dataTerminoReal}
              onChange={(e) => setDataTerminoReal(e.target.value)}
            />
          </div>
        )}

        {confirmMode === 'ERRO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
            <div className="form-group">
              <label>Motivo da permanência da falha: *</label>
              <textarea
                rows="2"
                className="form-control"
                placeholder="Descreva o que houve..."
                value={observacaoDecisao}
                onChange={(e) => setObservacaoDecisao(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Nova previsão de conclusão: *</label>
              <input
                type="datetime-local"
                className="form-control"
                value={novaPrevisao}
                onChange={(e) => setNovaPrevisao(e.target.value)}
              />
            </div>
          </div>
        )}

        {confirmMode && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: 'fit-content' }}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Confirmar e Atualizar Sistema'}
          </button>
        )}
      </div>
    </section>
  );
}

export default ConfirmacaoFinalManutencao;