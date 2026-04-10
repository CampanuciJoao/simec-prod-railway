// Ficheiro: src/pages/seguros/SalvarSeguroPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import SeguroForm from '../../components/seguros/SeguroForm';
import {
  getSeguroById,
  addSeguro,
  updateSeguro,
  getEquipamentos,
  getUnidades,
} from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function SalvarSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!id;

  const [initialData, setInitialData] = useState(null);
  const [equipamentosDisponiveis, setEquipamentosDisponiveis] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades(),
      ]);

      setEquipamentosDisponiveis(equipamentosData || []);
      setUnidadesDisponiveis(unidadesData || []);

      if (isEditing) {
        const seguroData = await getSeguroById(id);
        setInitialData(seguroData);
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
        await updateSeguro(id, formData);
        addToast('Seguro atualizado com sucesso!', 'success');
      } else {
        await addSeguro(formData);
        addToast('Seguro cadastrado com sucesso!', 'success');
      }

      setTimeout(() => navigate('/seguros'), 1000);
    } catch (err) {
      addToast(err.message || 'Erro ao salvar o seguro.', 'error');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="page-content-wrapper centered-loader">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content-wrapper">
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (isEditing && !initialData) {
    return (
      <div className="page-content-wrapper">
        <p className="no-data-message">Seguro não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          {isEditing
            ? `Editar Seguro (Nº: ${initialData?.apoliceNumero})`
            : 'Cadastrar Novo Seguro'}
        </h1>

        <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>

      <section className="page-section">
        <SeguroForm
          onSubmit={handleSave}
          initialData={initialData}
          isEditing={isEditing}
          equipamentosDisponiveis={equipamentosDisponiveis}
          unidadesDisponiveis={unidadesDisponiveis}
        />
      </section>
    </div>
  );
}

export default SalvarSeguroPage;