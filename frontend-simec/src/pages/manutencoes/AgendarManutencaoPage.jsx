// src/pages/AgendarManutencaoPage.jsx
// VERSÃO FINAL CORRETA

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ManutencaoForm from '../components/ManutencaoForm';
import { agendarManutencao } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function AgendarManutencaoPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleAgendar = async (formData) => {
    try {
      await agendarManutencao(formData);
      addToast('Manutenção agendada com sucesso!', 'success');
      setTimeout(() => {
        navigate('/manutencoes');
      }, 1500); 
    } catch (error) {
      console.error("Falha ao agendar manutenção na página:", error);
      throw error;
    }
  };

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">Agendar Nova Manutenção</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/manutencoes')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
      <section className="page-section">
        <ManutencaoForm 
          onSubmit={handleAgendar} 
          isEditing={false} 
        />
      </section>
    </div>
  );
}

export default AgendarManutencaoPage;