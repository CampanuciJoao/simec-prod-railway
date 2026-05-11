import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

function AlertasInfoPanel() {
  return (
    <div
      className="mt-8 rounded-2xl border p-5"
      style={{
        borderColor: 'var(--brand-primary-soft)',
        backgroundColor: 'var(--brand-primary-surface)',
      }}
    >
      <h4
        className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
        style={{ color: 'var(--brand-primary)' }}
      >
        <FontAwesomeIcon icon={faInfoCircle} />
        Instruções de gerenciamento
      </h4>

      <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <li>
          <strong style={{ color: 'var(--text-primary)' }}>Filtro inicial:</strong>{' '}
          por padrão, exibimos apenas os alertas <strong>não vistos</strong>. Os já visualizados ficam ocultos.
        </li>
        <li>
          <strong style={{ color: 'var(--text-primary)' }}>Revisar vistos:</strong>{' '}
          clique no card <strong>VISTOS</strong> do topo, ou troque o filtro de Status para <em>Visto</em>.
        </li>
        <li>
          <strong style={{ color: 'var(--text-primary)' }}>Dispensar:</strong>{' '}
          remove o alerta da lista atual e marca como tratado no sistema.
        </li>
        <li>
          <strong style={{ color: 'var(--text-primary)' }}>Recomendações:</strong>{' '}
          alertas inteligentes baseados em histórico, recorrência e criticidade — sem abertura automática de OS.
        </li>
      </ul>
    </div>
  );
}

export default AlertasInfoPanel;
