// Ficheiro: src/pages/seguros/DetalhesSeguroPage.jsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { getSeguroById } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarData } from '../../utils/timeUtils';

function DetalhesSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [seguro, setSeguro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSeguroDetails() {
      try {
        setLoading(true);
        const data = await getSeguroById(id);
        setSeguro(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar detalhes do seguro.');
        addToast('Erro ao carregar detalhes do seguro.', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchSeguroDetails();
    }
  }, [id, addToast]);

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
        <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Seguros
        </button>
      </div>
    );
  }

  if (!seguro) {
    return (
      <div className="page-content-wrapper">
        <div className="page-title-card">
          <h1 className="page-title-internal">Não Encontrado</h1>
        </div>
        <p className="no-data-message">O seguro solicitado não foi encontrado.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Seguros
        </button>
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          <FontAwesomeIcon icon={faShieldAlt} /> Detalhes do Seguro: {seguro.apoliceNumero}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>

      <section className="page-section">
        <h3>Informações da Apólice</h3>

        <div className="info-grid">
          <p><strong>Número da Apólice:</strong> {seguro.apoliceNumero}</p>
          <p><strong>Seguradora:</strong> {seguro.seguradora}</p>
          <p><strong>Início da Vigência:</strong> {formatarData(seguro.dataInicio)}</p>
          <p><strong>Fim da Vigência:</strong> {formatarData(seguro.dataFim)}</p>
          <p><strong>Status:</strong> {seguro.status}</p>
        </div>

        <div className="info-grid" style={{ marginTop: '15px' }}>
          <p>
            <strong>Vínculo:</strong>{' '}
            {seguro.equipamento
              ? `Equipamento: ${seguro.equipamento.modelo} (Tag: ${seguro.equipamento.tag})`
              : seguro.unidade
                ? `Unidade: ${seguro.unidade.nomeSistema || seguro.unidade.nome || 'Não informada'}`
                : 'Nenhum vínculo específico'}
          </p>
          <p><strong>Descrição da Cobertura:</strong> {seguro.cobertura || 'N/A'}</p>
        </div>
      </section>
    </div>
  );
}

export default DetalhesSeguroPage;