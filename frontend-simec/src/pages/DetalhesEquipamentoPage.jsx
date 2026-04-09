// Ficheiro: src/pages/DetalhesEquipamentoPage.jsx

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEquipamentoDetalhes } from '../hooks/equipamentos/useEquipamentoDetalhes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faInfoCircle,
  faHdd,
  faPaperclip,
  faHistory
} from '@fortawesome/free-solid-svg-icons';

import TabCadastro from '../components/equipamentos/tabs/TabCadastro';
import TabAcessorios from '../components/equipamentos/tabs/TabAcessorios';
import TabAnexos from '../components/equipamentos/tabs/TabAnexos';
import TabHistorico from '../components/equipamentos/tabs/TabHistorico';

function DetalhesEquipamentoPage() {
  const { equipamentoId } = useParams();
  const {
    equipamento,
    loading,
    error,
    refetch: refetchEquipamento
  } = useEquipamentoDetalhes(equipamentoId);

  const [abaAtiva, setAbaAtiva] = useState('detalhes');

  if (loading) {
    return (
      <div className="page-content-wrapper centered-loader">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content-wrapper">
        <div className="page-title-card">
          <h1 className="page-title-internal">Erro</h1>
        </div>
        <p className="form-error">{error}</p>
        <Link to="/equipamentos" className="btn btn-secondary">
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </Link>
      </div>
    );
  }

  if (!equipamento) {
    return (
      <div className="page-content-wrapper">
        <div className="page-title-card">
          <h1 className="page-title-internal">Não Encontrado</h1>
        </div>
        <p className="no-data-message">O equipamento solicitado não foi encontrado.</p>
        <Link to="/equipamentos" className="btn btn-secondary">
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar para a lista
        </Link>
      </div>
    );
  }

  const abas = [
    { id: 'detalhes', label: 'Cadastro', icon: faInfoCircle },
    { id: 'acessorios', label: 'Acessórios', icon: faHdd },
    { id: 'anexos', label: 'Anexos', icon: faPaperclip },
    { id: 'historico', label: 'Histórico', icon: faHistory },
  ];

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          Detalhes do Equipamento: {equipamento.modelo}
        </h1>
        <Link to="/equipamentos" className="btn btn-secondary">
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </Link>
      </div>

      <section className="page-section">
        <div className="tabs-navigation">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              className={`tab-button ${abaAtiva === aba.id ? 'active' : ''}`}
            >
              <FontAwesomeIcon icon={aba.icon} /> {aba.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {abaAtiva === 'detalhes' && (
            <TabCadastro
              equipamentoInicial={equipamento}
              onUpdate={refetchEquipamento}
            />
          )}

          {abaAtiva === 'acessorios' && (
            <TabAcessorios equipamentoId={equipamentoId} />
          )}

          {abaAtiva === 'anexos' && (
            <TabAnexos
              equipamentoId={equipamentoId}
              anexosIniciais={equipamento.anexos || []}
              onUpdate={refetchEquipamento}
            />
          )}

          {abaAtiva === 'historico' && (
            <TabHistorico equipamento={equipamento} />
          )}
        </div>
      </section>
    </div>
  );
}

export default DetalhesEquipamentoPage;