// Ficheiro: src/components/equipamentos/tabs/TabCadastro.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faEdit } from '@fortawesome/free-solid-svg-icons';
import { formatarData } from '../../../utils/timeUtils';

function TabCadastro({ equipamentoInicial }) {
  const navigate = useNavigate();

  const handleEditClick = () => {
    navigate(`/cadastros/equipamentos/editar/${equipamentoInicial.id}`);
  };

  return (
    <div>
      <div className="section-header">
        <h3 className="tab-title">
          <FontAwesomeIcon icon={faInfoCircle} /> Informações do Cadastro
        </h3>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleEditClick}
        >
          <FontAwesomeIcon icon={faEdit} /> Editar
        </button>
      </div>

      <div className="info-grid">
        <p><strong>Modelo:</strong> {equipamentoInicial.modelo || 'N/A'}</p>
        <p><strong>Nº Série (Tag):</strong> {equipamentoInicial.tag || 'N/A'}</p>
        <p><strong>Tipo:</strong> {equipamentoInicial.tipo || 'N/A'}</p>
        <p><strong>Localização:</strong> {equipamentoInicial.setor || 'N/A'}</p>
        <p><strong>Unidade:</strong> {equipamentoInicial.unidade?.nomeSistema || 'N/A'}</p>
        <p>
          <strong>Status:</strong>
          <span
            className={`status-badge-inline status-${(equipamentoInicial.status || '')
              .toLowerCase()
              .replace(/\s+/g, '-')}`}
          >
            {equipamentoInicial.status || 'N/A'}
          </span>
        </p>
        <p><strong>Fabricante:</strong> {equipamentoInicial.fabricante || 'N/A'}</p>
        <p><strong>Ano Fabricação:</strong> {equipamentoInicial.anoFabricacao || 'N/A'}</p>
        <p><strong>Data Instalação:</strong> {formatarData(equipamentoInicial.dataInstalacao)}</p>
        <p><strong>Nº de Patrimônio:</strong> {equipamentoInicial.numeroPatrimonio || 'N/A'}</p>
        <p><strong>Registro ANVISA:</strong> {equipamentoInicial.registroAnvisa || 'N/A'}</p>
      </div>

      <div className="info-grid" style={{ gridTemplateColumns: '1fr', marginTop: '15px' }}>
        <p><strong>Observações:</strong> {equipamentoInicial.observacoes || 'N/A'}</p>
      </div>
    </div>
  );
}

export default TabCadastro;