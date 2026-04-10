// Ficheiro: src/pages/SalvarManutencaoPage.jsx
// VERSÃO FINAL SÊNIOR - COM SINAL DE ATUALIZAÇÃO NO REDIRECIONAMENTO

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import ManutencaoForm from '../components/ManutencaoForm';
import { 
    getManutencaoById, 
    addManutencao,
    updateManutencao, 
    getEquipamentos, 
    getUnidades 
} from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

/**
 * Componente de página "inteligente" que orquestra a criação e edição de Manutenções.
 * É responsável por buscar os dados necessários (manutenção, equipamentos, unidades)
 * e passar a lógica de submissão para o componente de formulário.
 */
function SalvarManutencaoPage() {
  const { manutencaoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!manutencaoId;

  // Estados para os dados da página
  const [initialData, setInitialData] = useState(null);
  const [todosEquipamentos, setTodosEquipamentos] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca todos os dados necessários para o formulário.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Busca dados de suporte em paralelo para otimizar
      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades()
      ]);
      
      setTodosEquipamentos(equipamentosData || []);
      setUnidadesDisponiveis(unidadesData || []);
      
      // Se estiver no modo de edição, busca os dados da manutenção específica.
      if (isEditing) {
        const manutencaoData = await getManutencaoById(manutencaoId);
        setInitialData(manutencaoData);
      }
    } catch (err) {
      setError('Falha ao carregar dados necessários.');
      addToast(err.response?.data?.message || 'Falha ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [manutencaoId, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Função de callback que é passada para o ManutencaoForm.
   * @param {object} formData - Os dados do formulário a serem salvos.
   */
  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateManutencao(manutencaoId, formData);
        addToast('Manutenção atualizada com sucesso!', 'success');
      } else {
        await addManutencao(formData);
        addToast('Manutenção agendada com sucesso!', 'success');
      }
      
      // Navega de volta para a lista e passa um estado para forçar a atualização da página de manutenções.
      navigate('/manutencoes', { state: { refresh: true } });

    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao salvar a manutenção.', 'error');
      // Relança o erro para que o formulário saiba que a submissão falhou e possa parar o estado de 'submitting'.
      throw err;
    }
  };

  if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;
  if (error) return <div className="page-content-wrapper"><p className="form-error">{error}</p></div>;
  if (isEditing && !initialData) return <div className="page-content-wrapper"><p className="no-data-message">Manutenção não encontrada.</p></div>;

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          {isEditing ? `Editar Manutenção (OS: ${initialData?.numeroOS})` : 'Agendar Nova Manutenção'}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/manutencoes')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
      <section className="page-section">
        {/* Renderiza o formulário "burro", passando todos os dados e callbacks necessários */}
        <ManutencaoForm 
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

export default SalvarManutencaoPage;