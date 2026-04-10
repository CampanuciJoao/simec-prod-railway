// Ficheiro: src/pages/SalvarContratoPage.jsx
// VERSÃO REATORADA - PÁGINA INTELIGENTE

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import ContratoForm from '../components/ContratoForm';
import { getContratoById, addContrato, updateContrato, getEquipamentos, getUnidades } from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function SalvarContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!id;

  const [initialData, setInitialData] = useState(null);
  const [todosEquipamentos, setTodosEquipamentos] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca todos os dados necessários para a página.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Busca os dados de suporte primeiro
      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades()
      ]);
      setTodosEquipamentos(equipamentosData || []);
      setUnidadesDisponiveis(unidadesData || []);

      // Se estiver editando, busca os dados do contrato específico.
      if (isEditing) {
        const contratoData = await getContratoById(id);
        setInitialData(contratoData);
      }
    } catch (err) {
      setError('Falha ao carregar dados necessários para o formulário.');
      addToast('Falha ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateContrato(id, formData);
        addToast('Contrato atualizado com sucesso!', 'success');
      } else {
        await addContrato(formData);
        addToast('Contrato adicionado com sucesso!', 'success');
      }
      setTimeout(() => navigate('/contratos'), 1000);
    } catch (err) {
      addToast(err.message || 'Erro ao salvar o contrato.', 'error');
      throw err; // Relança para o formulário saber da falha.
    }
  };

  if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;
  if (error) return <div className="page-content-wrapper"><p className="form-error">{error}</p></div>;
  if (isEditing && !initialData) return <div className="page-content-wrapper"><p className="no-data-message">Contrato não encontrado.</p></div>;

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          {isEditing ? `Editar Contrato (Nº: ${initialData?.numeroContrato})` : 'Cadastrar Novo Contrato'}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/contratos')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
      <section className="page-section">
        <ContratoForm 
            onSubmit={handleSave}
            initialData={initialData}
            isEditing={isEditing}
            todosEquipamentos={todosEquipamentos}
            unidadesDisponiveis={unidadesDisponiveis}
        />
      </section>
    </div>
  );
}

export default SalvarContratoPage;