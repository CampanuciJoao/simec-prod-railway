// Ficheiro: frontend-simec/src/pages/SalvarUnidadePage.jsx
// VERSÃO FINAL, COMPLETA E CORRIGIDA

// --- Core & Routing Dependencies ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Custom Hooks, Context & API Services ---
import { useToast } from '../../contexts/ToastContext';
import { getUnidadeById, addUnidade, updateUnidade } from '../../services/api';

// --- UI Components & Assets ---
import UnidadeForm from '../components/UnidadeForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

/**
 * @component SalvarUnidadePage
 * @description Componente "inteligente" que orquestra a criação e edição de Unidades.
 * Ele busca os dados necessários, gerencia estados de UI (loading, error) e
 * passa a lógica de submissão e os dados iniciais para o componente de formulário.
 */
function SalvarUnidadePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!id;

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  // Lógica para buscar os dados da unidade para edição, memorizada com useCallback.
  const fetchUnidade = useCallback(() => {
    if (isEditing) {
      setLoading(true);
      getUnidadeById(id)
        .then(data => {
          setInitialData(data);
        })
        .catch(err => {
          console.error("Erro ao buscar unidade para edição:", err);
          setError('Falha ao carregar dados da unidade.');
          addToast('Falha ao carregar dados da unidade.', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isEditing, addToast]);

  // Executa a busca de dados quando o componente é montado no modo de edição.
  useEffect(() => {
    fetchUnidade();
  }, [fetchUnidade]);

  /**
   * @function handleSave
   * @description Recebe os dados do formulário e os submete para a API.
   * @param {object} formData - O objeto de estado já no formato "achatado" correto, vindo do UnidadeForm.
   */
  const handleSave = async (formData) => {
    try {
      // >> CORREÇÃO PRINCIPAL APLICADA AQUI <<
      // A lógica de "achatamento" (flattening) foi removida.
      // Agora, esta página confia que o `UnidadeForm` já está fornecendo
      // os dados no formato que a API espera. Ela simplesmente passa os dados adiante.
      if (isEditing) {
        await updateUnidade(id, formData);
        addToast('Unidade atualizada com sucesso!', 'success');
      } else {
        await addUnidade(formData);
        addToast('Unidade adicionada com sucesso!', 'success');
      }
      setTimeout(() => navigate('/cadastros/unidades'), 1000);
    } catch (apiError) {
      console.error("Falha ao salvar unidade:", apiError);
      const errorMessage = apiError?.message || 'Falha ao salvar. Verifique os dados e tente novamente.';
      addToast(errorMessage, 'error');
      // Relança o erro para que o UnidadeForm saiba que a submissão falhou.
      throw apiError;
    }
  };

  // --- Lógica de Renderização Condicional ---

  if (loading) {
    return (
      <div className="page-content-wrapper">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Carregando dados da unidade...</p>
        </div>
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
        <p className="no-data-message">A unidade solicitada não foi encontrada.</p>
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          {isEditing ? `Editar Unidade: ${initialData?.nomeSistema}` : 'Adicionar Nova Unidade'}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/cadastros/unidades')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
      <section className="page-section">
        <UnidadeForm
          onSubmit={handleSave}
          initialData={initialData}
          isEditing={isEditing}
        />
      </section>
    </div>
  );
}

export default SalvarUnidadePage;