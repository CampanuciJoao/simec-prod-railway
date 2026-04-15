import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

function AlertasInfoPanel() {
  return (
    <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-800">
        <FontAwesomeIcon icon={faInfoCircle} />
        Instruções de gerenciamento
      </h4>

      <ul className="space-y-2 text-sm text-blue-700/90">
        <li>
          <strong>Filtro inicial:</strong> por padrão, exibimos os alertas não vistos.
        </li>
        <li>
          <strong>Dispensar:</strong> remove o alerta da sua lista atual e marca como tratado no sistema.
        </li>
        <li>
          <strong>Recomendações:</strong> são alertas inteligentes baseados em histórico, recorrência e criticidade, sem abertura automática de OS.
        </li>
        <li>
          <strong>Status "Visto":</strong> use o filtro de status para consultar alertas históricos ou já tratados.
        </li>
      </ul>
    </div>
  );
}

export default AlertasInfoPanel;