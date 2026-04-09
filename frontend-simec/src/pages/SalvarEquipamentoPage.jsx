// Ficheiro: src/pages/SalvarEquipamentoPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useToast } from '../contexts/ToastContext';
import { getEquipamentoById, addEquipamento, updateEquipamento } from '../services/api';

import EquipamentoForm from '../components/equipamentos/EquipamentoForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function SalvarEquipamentoPage() {
  const { equipamentoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!equipamentoId;

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const fetchEquipamento = useCallback(async () => {
    if (!isEditing || !equipamentoId) return;

    setLoading(true);
    setError('');

    try {
      const data = await getEquipamentoById(equipamentoId);
      setInitialData(data);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Erro ao carregar dados do equipamento.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, isEditing, addToast]);

  useEffect(() => {
    fetchEquipamento();
  }, [fetchEquipamento]);

  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateEquipamento(equipamentoId, formData);
        addToast('Equipamento atualizado com sucesso!', 'success');
      } else {
        await addEquipamento(formData);
        addToast('Equipamento adicionado com sucesso!', 'success');
      }

      setTimeout(() => {
        navigate('/equipamentos');
      }, 1000);
    } catch (apiError) {
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.message ||
        'Erro desconhecido ao salvar.';
      addToast(errorMessage, 'error');
      throw apiError;
    }
  };

  if (loading) {
    return (
      <div className="page-content-wrapper">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" /> Carregando...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content-wrapper">
        <div className="page-title-card">
          <h1 className="page-title-internal">Erro</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/equipamentos')}>
            <FontAwesomeIcon icon={faArrowLeft} /> Voltar
          </button>
        </div>
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (isEditing && !initialData) {
    return (
      <div className="page-content-wrapper">
        <div className="page-title-card">
          <h1 className="page-title-internal">Não encontrado</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/equipamentos')}>
            <FontAwesomeIcon icon={faArrowLeft} /> Voltar
          </button>
        </div>
        <p className="form-error">Equipamento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          {isEditing
            ? `Editar Equipamento (Tag: ${initialData?.tag})`
            : 'Adicionar Novo Equipamento'}
        </h1>

        <button className="btn btn-secondary" onClick={() => navigate('/equipamentos')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>

      <section className="page-section">
        <EquipamentoForm
          onSubmit={handleSave}
          initialData={initialData}
          isEditing={isEditing}
        />
      </section>
    </div>
  );
}

export default SalvarEquipamentoPage;