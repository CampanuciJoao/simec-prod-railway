// Ficheiro: src/components/abas-equipamento/TabCadastro.jsx
// VERSÃO FINAL SÊNIOR - APENAS VISUALIZAÇÃO COM BOTÃO DE REDIRECIONAMENTO

import React from 'react';
import { useNavigate } from 'react-router-dom'; // Importa o hook de navegação
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faEdit } from '@fortawesome/free-solid-svg-icons';
import { formatarData } from '../../utils/timeUtils';

/**
 * Componente que representa o conteúdo da aba "Cadastro" na página de detalhes.
 * Agora, sua única responsabilidade é exibir os dados e fornecer um botão
 * que redireciona para a página de edição dedicada.
 * @param {{equipamentoInicial: object}} props
 */
function TabCadastro({ equipamentoInicial }) {
  const navigate = useNavigate();

  // Função que navega para a página de edição.
  const handleEditClick = () => {
    navigate(`/cadastros/equipamentos/editar/${equipamentoInicial.id}`);
  };

  return (
    <div>
      <div className="section-header">
        <h3 className="tab-title">
          <FontAwesomeIcon icon={faInfoCircle} /> Informações do Cadastro
        </h3>
        {/* O botão agora chama a função de navegação */}
        <button className="btn btn-primary btn-sm" onClick={handleEditClick}>
          <FontAwesomeIcon icon={faEdit} /> Editar
        </button>
      </div>

      {/* Apenas o modo de visualização é necessário aqui */}
      <div className="info-grid">
          <p><strong>Modelo:</strong> {equipamentoInicial.modelo || 'N/A'}</p>
          <p><strong>Nº Série (Tag):</strong> {equipamentoInicial.tag || 'N/A'}</p>
          <p><strong>Tipo:</strong> {equipamentoInicial.tipo || 'N/A'}</p>
          <p><strong>Localização:</strong> {equipamentoInicial.setor || 'N/A'}</p>
          <p><strong>Unidade:</strong> {equipamentoInicial.unidade?.nomeSistema || 'N/A'}</p>
          <p><strong>Status:</strong><span className={`status-badge-inline status-${(equipamentoInicial.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{equipamentoInicial.status || 'N/A'}</span></p>
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