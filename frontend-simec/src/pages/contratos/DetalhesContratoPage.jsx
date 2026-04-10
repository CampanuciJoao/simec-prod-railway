// Ficheiro: src/pages/DetalhesContratoPage.jsx
// Versão: 1.0 (Placeholder)
// Descrição: Página de detalhes para um contrato. Será expandida futuramente.

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faFileContract } from '@fortawesome/free-solid-svg-icons';
import { getContratoById } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarData } from '../../utils/timeUtils';


function DetalhesContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContratoDetails() {
      try {
        setLoading(true);
        const data = await getContratoById(id);
        setContrato(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar detalhes do contrato.');
        addToast('Erro ao carregar detalhes do contrato.', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchContratoDetails();
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
        <div className="page-title-card"><h1 className="page-title-internal">Erro</h1></div>
        <p className="form-error">{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/contratos')}>
            <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Contratos
        </button>
      </div>
    );
  }

  if (!contrato) {
    return (
        <div className="page-content-wrapper">
            <div className="page-title-card"><h1 className="page-title-internal">Não Encontrado</h1></div>
            <p className="no-data-message">O contrato solicitado não foi encontrado.</p>
            <button className="btn btn-secondary" onClick={() => navigate('/contratos')}>
                <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Contratos
            </button>
        </div>
    );
  }


  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          <FontAwesomeIcon icon={faFileContract} /> Detalhes do Contrato: {contrato.numeroContrato}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/contratos')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
      <section className="page-section">
        <h3>Informações do Contrato</h3>
        <div className="info-grid">
            <p><strong>Número do Contrato:</strong> {contrato.numeroContrato}</p>
            <p><strong>Categoria:</strong> {contrato.categoria}</p>
            <p><strong>Fornecedor:</strong> {contrato.fornecedor}</p>
            <p><strong>Data de Início:</strong> {formatarData(contrato.dataInicio)}</p>
            <p><strong>Data de Fim:</strong> {formatarData(contrato.dataFim)}</p>
            <p><strong>Status:</strong> {contrato.status}</p>
        </div>
        <div className="info-grid" style={{marginTop: '15px'}}>
            <p><strong>Unidades Cobertas:</strong> {contrato.unidadesCobertas?.map(u => u.nomeSistema).join(', ') || 'N/A'}</p>
            <p><strong>Equipamentos Cobertos:</strong> {contrato.equipamentosCobertos?.map(e => `${e.modelo} (Tag: ${e.tag})`).join(', ') || 'N/A'}</p>
        </div>
        {/* Você pode adicionar mais seções e detalhes aqui, como anexos, histórico, etc. */}
      </section>
    </div>
  );
}

export default DetalhesContratoPage;
