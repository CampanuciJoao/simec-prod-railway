// src/pages/AdicionarContratoPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import ContratoForm from '../components/ContratoForm';
import { addContrato } from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function AdicionarContratoPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleAdicionar = async (formData) => {
    try {
      await addContrato(formData);
      addToast('Contrato adicionado com sucesso!', 'success');
      setTimeout(() => navigate('/contratos'), 1500);
    } catch (err) {
      addToast(err.message || 'Erro ao adicionar contrato.', 'error');
      // Relança o erro para que o formulário possa resetar o estado de 'submitting'
      throw err; 
    }
  };

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">Cadastrar Novo Contrato</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/contratos')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
      <section className="page-section">
        <ContratoForm 
            onSubmit={handleAdicionar}
            isEditing={false}
        />
      </section>
    </div>
  );
}

export default AdicionarContratoPage;